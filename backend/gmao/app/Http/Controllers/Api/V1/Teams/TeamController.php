<?php

namespace App\Http\Controllers\Api\V1\Teams;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\Teams\TeamResource;
use App\Models\Member;
use App\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeamController extends Controller
{
    // GET /teams — paginated list with member count
    public function index(Request $request): JsonResponse
    {
        $company = $request->attributes->get('currentCompany');

        $query = Team::query()
            ->where('company_id', $company->id)
            ->withCount('members')
            ->with('members.user')
            ->orderBy('name');

        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->query('search') . '%');
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->query('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        $teams = $query->paginate($request->query('per_page', 15));

        return response()->json([
            'success' => true,
            'data'    => [
                'teams'      => TeamResource::collection($teams->items()),
                'pagination' => [
                    'total'        => $teams->total(),
                    'per_page'     => $teams->perPage(),
                    'current_page' => $teams->currentPage(),
                    'last_page'    => $teams->lastPage(),
                ],
            ],
        ]);
    }

    // GET /teams/all — lightweight list for dropdowns (includes member_ids)
    public function all(Request $request): JsonResponse
    {
        $company = $request->attributes->get('currentCompany');

        $teams = Team::query()
            ->where('company_id', $company->id)
            ->where('is_active', true)
            ->with('members:id')
            ->orderBy('name')
            ->get(['id', 'name', 'color']);

        return response()->json([
            'success' => true,
            'data'    => [
                'teams' => $teams->map(fn (Team $t) => [
                    'id'         => $t->id,
                    'name'       => $t->name,
                    'color'      => $t->color,
                    'member_ids' => $t->members->pluck('id')->values()->all(),
                ]),
            ],
        ]);
    }

    // GET /teams/{team}
    public function show(Request $request, Team $team): JsonResponse
    {
        $company = $request->attributes->get('currentCompany');

        if ((int) $team->company_id !== (int) $company->id) {
            return response()->json(['success' => false, 'message' => 'Team not found.'], 404);
        }

        $team->load('members.user');
        $team->loadCount('members');

        return response()->json(['success' => true, 'data' => ['team' => new TeamResource($team)]]);
    }

    // POST /teams
    public function store(Request $request): JsonResponse
    {
        $company = $request->attributes->get('currentCompany');

        $validated = $request->validate([
            'name'        => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
            'color'       => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'is_active'   => ['boolean'],
            'member_ids'  => ['array'],
            'member_ids.*'=> ['integer', 'exists:members,id'],
        ]);

        $team = Team::create([
            'company_id'  => $company->id,
            'name'        => $validated['name'],
            'description' => $validated['description'] ?? null,
            'color'       => $validated['color'] ?? '#6366f1',
            'is_active'   => $validated['is_active'] ?? true,
        ]);

        if (!empty($validated['member_ids'])) {
            $validIds = Member::query()
                ->where('company_id', $company->id)
                ->whereIn('id', $validated['member_ids'])
                ->pluck('id');
            $team->members()->sync($validIds);
        }

        $team->load('members.user');
        $team->loadCount('members');

        return response()->json([
            'success' => true,
            'message' => 'Team created successfully.',
            'data'    => ['team' => new TeamResource($team)],
        ], 201);
    }

    // PUT /teams/{team}
    public function update(Request $request, Team $team): JsonResponse
    {
        $company = $request->attributes->get('currentCompany');

        if ((int) $team->company_id !== (int) $company->id) {
            return response()->json(['success' => false, 'message' => 'Team not found.'], 404);
        }

        $validated = $request->validate([
            'name'        => ['sometimes', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
            'color'       => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'is_active'   => ['boolean'],
            'member_ids'  => ['array'],
            'member_ids.*'=> ['integer', 'exists:members,id'],
        ]);

        $team->fill(array_filter([
            'name'        => $validated['name'] ?? null,
            'description' => array_key_exists('description', $validated) ? $validated['description'] : null,
            'color'       => $validated['color'] ?? null,
            'is_active'   => $validated['is_active'] ?? null,
        ], fn ($v) => $v !== null));

        if (array_key_exists('description', $validated)) {
            $team->description = $validated['description'];
        }

        $team->save();

        if (array_key_exists('member_ids', $validated)) {
            $validIds = Member::query()
                ->where('company_id', $company->id)
                ->whereIn('id', $validated['member_ids'])
                ->pluck('id');
            $team->members()->sync($validIds);
        }

        $team->load('members.user');
        $team->loadCount('members');

        return response()->json([
            'success' => true,
            'message' => 'Team updated successfully.',
            'data'    => ['team' => new TeamResource($team)],
        ]);
    }

    // DELETE /teams/{team}
    public function destroy(Request $request, Team $team): JsonResponse
    {
        $company = $request->attributes->get('currentCompany');

        if ((int) $team->company_id !== (int) $company->id) {
            return response()->json(['success' => false, 'message' => 'Team not found.'], 404);
        }

        $team->delete();

        return response()->json(['success' => true, 'message' => 'Team deleted.']);
    }
}
