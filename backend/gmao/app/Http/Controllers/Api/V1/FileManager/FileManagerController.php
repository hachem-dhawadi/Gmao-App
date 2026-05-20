<?php

namespace App\Http\Controllers\Api\V1\FileManager;

use App\Http\Controllers\Controller;
use App\Models\FmDirectory;
use App\Models\FmDirectoryShare;
use App\Models\FmFile;
use App\Models\FmFileShare;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FileManagerController extends Controller
{
    // ──────────────────────────────────────────────────────────────────────────
    // Listing
    // ──────────────────────────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $company  = $request->attributes->get('currentCompany');
        $member   = $request->attributes->get('currentMember');
        $dirId    = $request->query('directory_id') ?: null;
        $memberId = $member?->id ?? 0;

        // Breadcrumb path
        $breadcrumb = [];
        if ($dirId) {
            $dir = FmDirectory::query()
                ->where('company_id', $company->id)
                ->findOrFail($dirId);

            foreach ($dir->getAncestors() as $ancestor) {
                $breadcrumb[] = ['id' => (string) $ancestor->id, 'label' => $ancestor->name];
            }
            $breadcrumb[] = ['id' => (string) $dir->id, 'label' => $dir->name];
        }

        // When navigating into a directory that is directly shared with this member,
        // they can see ALL files inside it (folder-level access).
        $folderSharedWithMember = $dirId && $memberId > 0
            && FmDirectoryShare::query()
                ->where('fm_directory_id', $dirId)
                ->where('member_id', $memberId)
                ->exists();

        // Sub-directories — visible if created by member, directly shared, or
        // subtree contains files/folders visible to this member.
        // When the parent folder itself is shared with this member, ALL
        // subdirectories are visible (folder-level access propagates down).
        $dirs = FmDirectory::query()
            ->where('company_id', $company->id)
            ->where('parent_id', $dirId)
            ->with(['createdBy', 'shares.member.user'])
            ->orderBy('name')
            ->get()
            ->filter(function (FmDirectory $d) use ($memberId, $folderSharedWithMember) {
                // Parent folder is shared — all children are visible.
                if ($folderSharedWithMember) return true;
                if ($d->created_by_member_id !== null
                    && $memberId > 0
                    && (int) $d->created_by_member_id === $memberId) {
                    return true;
                }
                // Folders with no creator (legacy / admin-created) are visible to all.
                if ($d->created_by_member_id === null) return true;
                // Directly shared with this member.
                if ($memberId > 0 && $d->shares->contains('member_id', $memberId)) {
                    return true;
                }
                // Other members see this folder only if it contains visible content.
                return $memberId > 0 && $this->hasVisibleContent((int) $d->id, $memberId);
            })
            ->map(fn (FmDirectory $d) => $this->formatDirectory($d, $member));

        // Files — owner always sees their own; others see files shared with them
        // OR all files if the current directory is shared with them at folder level.
        $files = FmFile::query()
            ->where('company_id', $company->id)
            ->where('fm_directory_id', $dirId)
            ->when(! $folderSharedWithMember, function ($q) use ($member) {
                $q->where(function ($q2) use ($member) {
                    $q2->where('uploaded_by_member_id', $member?->id)
                       ->orWhereHas('shares', fn ($q3) => $q3->where('member_id', $member?->id));
                });
            })
            ->with(['uploadedBy', 'shares.member.user'])
            ->orderBy('original_name')
            ->get()
            ->map(fn (FmFile $f) => $this->formatFile($f));

        $list = collect()->concat($dirs)->concat($files)->values();

        return response()->json([
            'success' => true,
            'data'    => [
                'list'      => $list,
                'directory' => $breadcrumb,
            ],
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Directories
    // ──────────────────────────────────────────────────────────────────────────

    public function storeDirectory(Request $request): JsonResponse
    {
        $company = $request->attributes->get('currentCompany');
        $member  = $request->attributes->get('currentMember');

        $validated = $request->validate([
            'name'      => ['required', 'string', 'max:255'],
            'parent_id' => ['nullable', 'integer'],
        ]);

        if ($validated['parent_id'] ?? null) {
            FmDirectory::query()
                ->where('company_id', $company->id)
                ->findOrFail($validated['parent_id']);
        }

        $dir = FmDirectory::query()->create([
            'company_id'           => $company->id,
            'created_by_member_id' => $member?->id,
            'parent_id'            => $validated['parent_id'] ?? null,
            'name'                 => $validated['name'],
        ]);

        $dir->load(['createdBy', 'shares.member.user']);

        return response()->json([
            'success' => true,
            'message' => 'Folder created.',
            'data'    => ['item' => $this->formatDirectory($dir, $member)],
        ], 201);
    }

    public function renameDirectory(Request $request, int $id): JsonResponse
    {
        $company = $request->attributes->get('currentCompany');
        $member  = $request->attributes->get('currentMember');

        $dir = FmDirectory::query()
            ->where('company_id', $company->id)
            ->findOrFail($id);

        $validated = $request->validate(['name' => ['required', 'string', 'max:255']]);
        $dir->update(['name' => $validated['name']]);
        $dir->load(['createdBy', 'shares.member.user']);

        return response()->json([
            'success' => true,
            'message' => 'Folder renamed.',
            'data'    => ['item' => $this->formatDirectory($dir, $member)],
        ]);
    }

    public function destroyDirectory(Request $request, int $id): JsonResponse
    {
        $company = $request->attributes->get('currentCompany');

        $dir = FmDirectory::query()
            ->where('company_id', $company->id)
            ->findOrFail($id);

        $this->deleteDirectoryFiles($dir);

        $dir->delete(); // cascades children via DB

        return response()->json(['success' => true, 'message' => 'Folder deleted.']);
    }

    public function shareDirectory(Request $request, int $id): JsonResponse
    {
        $company = $request->attributes->get('currentCompany');

        $dir = FmDirectory::query()
            ->where('company_id', $company->id)
            ->findOrFail($id);

        $validated = $request->validate([
            'member_ids'   => ['required', 'array'],
            'member_ids.*' => ['integer'],
        ]);

        $validIds = \App\Models\Member::query()
            ->where('company_id', $company->id)
            ->whereIn('id', $validated['member_ids'])
            ->pluck('id')
            ->toArray();

        // Sync shares
        FmDirectoryShare::query()->where('fm_directory_id', $dir->id)->delete();

        foreach ($validIds as $memberId) {
            FmDirectoryShare::query()->create([
                'fm_directory_id' => $dir->id,
                'member_id'       => $memberId,
            ]);
        }

        $dir->load(['createdBy', 'shares.member.user']);

        return response()->json([
            'success' => true,
            'message' => 'Folder shared.',
            'data'    => ['item' => $this->formatDirectory($dir, null)],
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Files
    // ──────────────────────────────────────────────────────────────────────────

    public function upload(Request $request): JsonResponse
    {
        $company = $request->attributes->get('currentCompany');
        $member  = $request->attributes->get('currentMember');

        $request->validate([
            'files'        => ['required', 'array'],
            'files.*'      => ['required', 'file', 'max:51200'], // 50 MB each
            'directory_id' => ['nullable', 'integer'],
        ]);

        $dirId = $request->input('directory_id') ?: null;

        if ($dirId) {
            FmDirectory::query()
                ->where('company_id', $company->id)
                ->findOrFail($dirId);
        }

        $uploaded = [];

        foreach ($request->file('files') as $file) {
            $storedPath = $file->store("fm/{$company->id}", 'local');

            $record = FmFile::query()->create([
                'company_id'              => $company->id,
                'fm_directory_id'         => $dirId,
                'uploaded_by_member_id'   => $member?->id,
                'original_name'           => $file->getClientOriginalName(),
                'stored_path'             => $storedPath,
                'mime_type'               => $file->getMimeType() ?? 'application/octet-stream',
                'size_bytes'              => $file->getSize(),
            ]);

            try {
                $record->load(['uploadedBy', 'shares']);
            } catch (\Throwable) {
                // Relations unavailable — formatFile handles null gracefully
            }

            $uploaded[] = $this->formatFile($record);
        }

        return response()->json([
            'success' => true,
            'message' => count($uploaded) . ' file(s) uploaded.',
            'data'    => ['items' => $uploaded],
        ], 201);
    }

    public function renameFile(Request $request, int $id): JsonResponse
    {
        $company = $request->attributes->get('currentCompany');

        $file = FmFile::query()
            ->where('company_id', $company->id)
            ->findOrFail($id);

        $validated = $request->validate(['name' => ['required', 'string', 'max:255']]);

        $ext = pathinfo($file->original_name, PATHINFO_EXTENSION);
        $newName = $validated['name'];
        if ($ext && ! Str::endsWith($newName, '.' . $ext)) {
            $newName .= '.' . $ext;
        }

        $file->update(['original_name' => $newName]);
        $file->load(['uploadedBy', 'shares.member.user']);

        return response()->json([
            'success' => true,
            'message' => 'File renamed.',
            'data'    => ['item' => $this->formatFile($file)],
        ]);
    }

    public function destroyFile(Request $request, int $id): JsonResponse
    {
        $company = $request->attributes->get('currentCompany');

        $file = FmFile::query()
            ->where('company_id', $company->id)
            ->findOrFail($id);

        Storage::disk('local')->delete($file->stored_path);
        $file->forceDelete();

        return response()->json(['success' => true, 'message' => 'File deleted.']);
    }

    public function download(Request $request, int $id)
    {
        $company = $request->attributes->get('currentCompany');

        $file = FmFile::query()
            ->where('company_id', $company->id)
            ->findOrFail($id);

        if (! Storage::disk('local')->exists($file->stored_path)) {
            return response()->json(['success' => false, 'message' => 'File not found on disk.'], 404);
        }

        return Storage::disk('local')->download($file->stored_path, $file->original_name, [
            'Content-Type' => $file->mime_type,
        ]);
    }

    public function shareFile(Request $request, int $id): JsonResponse
    {
        $company = $request->attributes->get('currentCompany');

        $file = FmFile::query()
            ->where('company_id', $company->id)
            ->findOrFail($id);

        $validated = $request->validate([
            'member_ids'   => ['required', 'array'],
            'member_ids.*' => ['integer'],
        ]);

        $validIds = \App\Models\Member::query()
            ->where('company_id', $company->id)
            ->whereIn('id', $validated['member_ids'])
            ->pluck('id')
            ->toArray();

        FmFileShare::query()->where('fm_file_id', $file->id)->delete();

        foreach ($validIds as $memberId) {
            FmFileShare::query()->create([
                'fm_file_id' => $file->id,
                'member_id'  => $memberId,
            ]);
        }

        $file->load(['uploadedBy', 'shares.member.user']);

        return response()->json([
            'success' => true,
            'message' => 'File shared.',
            'data'    => ['item' => $this->formatFile($file)],
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────────────────────

    private function formatDirectory(FmDirectory $dir, $member): array
    {
        $author = $dir->createdBy?->user;
        $size   = $this->getDirectorySizeRecursive($dir->id);

        $permissions = $dir->relationLoaded('shares')
            ? $dir->shares->map(function (FmDirectoryShare $share) {
                $user = $share->member?->user;
                return [
                    'memberId' => $share->member_id,
                    'userName' => $user?->name ?? 'Unknown',
                    'userImg'  => '',
                    'role'     => 'viewer',
                ];
            })->values()->all()
            : [];

        return [
            'id'         => (string) $dir->id,
            'name'       => $dir->name,
            'fileType'   => 'directory',
            'srcUrl'     => '',
            'size'       => $size,
            'author'     => [
                'name'  => $author?->name ?? 'Unknown',
                'email' => $author?->email ?? '',
                'img'   => '',
            ],
            'activities'  => [
                [
                    'userName'   => $author?->name ?? 'Unknown',
                    'userImg'    => '',
                    'actionType' => 'created',
                    'timestamp'  => $dir->created_at?->timestamp ?? 0,
                ],
            ],
            'permissions' => $permissions,
            'uploadDate'  => $dir->created_at?->timestamp ?? 0,
            'recent'      => false,
        ];
    }

    private function formatFile(FmFile $file): array
    {
        $author = $file->uploadedBy?->user;

        $permissions = $file->shares->map(function (FmFileShare $share) {
            $user = $share->member?->user;
            return [
                'memberId' => $share->member_id,
                'userName' => $user?->name ?? 'Unknown',
                'userImg'  => '',
                'role'     => 'viewer',
            ];
        })->values()->all();

        return [
            'id'         => (string) $file->id,
            'name'       => $file->original_name,
            'fileType'   => $this->resolveFileType($file->mime_type, $file->original_name),
            'srcUrl'     => '',
            'size'       => $file->size_bytes,
            'author'     => [
                'name'  => $author?->name ?? 'Unknown',
                'email' => $author?->email ?? '',
                'img'   => '',
            ],
            'activities'  => [
                [
                    'userName'   => $author?->name ?? 'Unknown',
                    'userImg'    => '',
                    'actionType' => 'modified',
                    'timestamp'  => $file->updated_at?->timestamp ?? 0,
                ],
            ],
            'permissions' => $permissions,
            'uploadDate'  => $file->created_at?->timestamp ?? 0,
            'recent'      => false,
        ];
    }

    private function resolveFileType(string $mimeType, string $originalName): string
    {
        $map = [
            'application/pdf'                                                          => 'pdf',
            'application/vnd.ms-excel'                                                 => 'xls',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'       => 'xls',
            'application/msword'                                                       => 'doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'doc',
            'application/vnd.ms-powerpoint'                                            => 'ppt',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation' => 'ppt',
            'image/jpeg'                                                               => 'image/jpeg',
            'image/jpg'                                                                => 'image/jpeg',
            'image/png'                                                                => 'png',
            'image/gif'                                                                => 'gif',
            'image/webp'                                                               => 'webp',
            'text/plain'                                                               => 'txt',
            'text/csv'                                                                 => 'csv',
            'application/zip'                                                          => 'zip',
            'application/x-rar-compressed'                                             => 'zip',
        ];

        if (isset($map[$mimeType])) {
            return $map[$mimeType];
        }

        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        return $ext ?: 'file';
    }

    /**
     * Returns true if the directory subtree contains at least one file or
     * sub-directory that the given member can see.
     */
    private function hasVisibleContent(int $dirId, int $memberId): bool
    {
        // Directory directly shared with this member counts as visible content.
        if (FmDirectoryShare::query()
            ->where('fm_directory_id', $dirId)
            ->where('member_id', $memberId)
            ->exists()) {
            return true;
        }

        if (FmFile::query()
            ->where('fm_directory_id', $dirId)
            ->where(function ($q) use ($memberId) {
                $q->where('uploaded_by_member_id', $memberId)
                  ->orWhereHas('shares', fn ($q2) => $q2->where('member_id', $memberId));
            })
            ->exists()) {
            return true;
        }

        foreach (FmDirectory::query()->where('parent_id', $dirId)->pluck('id') as $childId) {
            if ($this->hasVisibleContent((int) $childId, $memberId)) {
                return true;
            }
        }

        return false;
    }

    private function getDirectorySizeRecursive(int $dirId): int
    {
        $size = (int) FmFile::query()
            ->where('fm_directory_id', $dirId)
            ->sum('size_bytes');

        foreach (FmDirectory::query()->where('parent_id', $dirId)->pluck('id') as $childId) {
            $size += $this->getDirectorySizeRecursive((int) $childId);
        }

        return $size;
    }

    private function deleteDirectoryFiles(FmDirectory $dir): void
    {
        foreach ($dir->files as $file) {
            Storage::disk('local')->delete($file->stored_path);
            $file->forceDelete();
        }

        foreach ($dir->children as $child) {
            $this->deleteDirectoryFiles($child);
        }
    }
}
