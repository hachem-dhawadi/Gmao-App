import { useState, useCallback, useEffect, useRef, memo } from 'react'
import {
    View, Text, StyleSheet, FlatList,
    RefreshControl, ActivityIndicator, Pressable,
    Animated, ScrollView, Alert, Linking, Modal,
    TouchableOpacity as RNTouchableOpacity, TextInput,
} from 'react-native'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import {
    apiGetFileList, apiUploadFile, apiDeleteFile, apiDeleteDirectory,
    apiCreateDirectory, apiGetDownloadToken, getTokenDownloadUrl,
    type FmItem, type FmBreadcrumb,
} from '@/services/FileService'
import { useAuthStore } from '@/store/authStore'

// ── helpers ───────────────────────────────────────────────────────────────────

const FILE_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
    directory: { icon: 'folder',           color: '#f59e0b', bg: '#fef3c7' },
    pdf:       { icon: 'document-text',    color: '#ef4444', bg: '#fee2e2' },
    doc:       { icon: 'document-text',    color: '#2563eb', bg: '#dbeafe' },
    docx:      { icon: 'document-text',    color: '#2563eb', bg: '#dbeafe' },
    xls:       { icon: 'grid',             color: '#059669', bg: '#d1fae5' },
    xlsx:      { icon: 'grid',             color: '#059669', bg: '#d1fae5' },
    csv:       { icon: 'grid',             color: '#059669', bg: '#d1fae5' },
    jpg:       { icon: 'image',            color: '#8b5cf6', bg: '#ede9fe' },
    jpeg:      { icon: 'image',            color: '#8b5cf6', bg: '#ede9fe' },
    png:       { icon: 'image',            color: '#8b5cf6', bg: '#ede9fe' },
    gif:       { icon: 'image',            color: '#8b5cf6', bg: '#ede9fe' },
    webp:      { icon: 'image',            color: '#8b5cf6', bg: '#ede9fe' },
    svg:       { icon: 'image',            color: '#8b5cf6', bg: '#ede9fe' },
    mp4:       { icon: 'film',             color: '#f97316', bg: '#ffedd5' },
    mp3:       { icon: 'musical-notes',    color: '#06b6d4', bg: '#cffafe' },
    zip:       { icon: 'archive',          color: '#6b7280', bg: '#f3f4f6' },
    rar:       { icon: 'archive',          color: '#6b7280', bg: '#f3f4f6' },
    txt:       { icon: 'document-outline', color: '#9ca3af', bg: '#f9fafb' },
}

function getFileStyle(type: string) {
    return FILE_ICONS[type?.toLowerCase()] ?? { icon: 'document-outline', color: '#9ca3af', bg: '#f9fafb' }
}

function formatSize(bytes: number | null): string {
    if (!bytes) return '—'
    if (bytes < 1024)        return `${bytes} B`
    if (bytes < 1048576)     return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1073741824)  return `${(bytes / 1048576).toFixed(1)} MB`
    return `${(bytes / 1073741824).toFixed(1)} GB`
}

function formatDate(ts: number): string {
    if (!ts) return '—'
    return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── File Item Card ────────────────────────────────────────────────────────────

const FileItemCard = memo(function FileItemCard({
    item,
    onPress,
    onLongPress,
}: {
    item: FmItem
    onPress: (item: FmItem) => void
    onLongPress?: (item: FmItem) => void
}) {
    const style = getFileStyle(item.fileType)
    const isDir = item.fileType === 'directory'

    return (
        <TouchableOpacity
            style={s.card}
            activeOpacity={0.72}
            onPress={() => onPress(item)}
            onLongPress={onLongPress ? () => onLongPress(item) : undefined}
            delayLongPress={500}
        >
            <View style={[s.fileIcon, { backgroundColor: style.bg }]}>
                <Ionicons name={style.icon as never} size={24} color={style.color} />
            </View>
            <View style={s.cardInfo}>
                <Text style={s.cardName} numberOfLines={2}>{item.name}</Text>
                <View style={s.cardMeta}>
                    {!isDir && <Text style={s.metaText}>{formatSize(item.size)}</Text>}
                    {!isDir && <Text style={s.metaDot}>·</Text>}
                    <Text style={s.metaText}>{isDir ? 'Folder' : item.fileType.toUpperCase()}</Text>
                    {item.uploadDate > 0 && (
                        <>
                            <Text style={s.metaDot}>·</Text>
                            <Text style={s.metaText}>{formatDate(item.uploadDate)}</Text>
                        </>
                    )}
                </View>
            </View>
            <Ionicons
                name={isDir ? 'chevron-forward' : 'ellipsis-horizontal'}
                size={16}
                color="#ccc"
            />
        </TouchableOpacity>
    )
})

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function FilesScreen() {
    const insets     = useSafeAreaInsets()
    const hasRead    = useAuthStore(st => st.user?.permissions?.includes('files.read')  ?? false)
    const hasWrite   = useAuthStore(st => st.user?.permissions?.includes('files.write') ?? false)
    const baseUrl    = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.43.163:8000/api/v1'

    if (!hasRead) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }} edges={['top']}>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 16 }}>
                    <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="lock-closed-outline" size={32} color="#aaa" />
                    </View>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#111', textAlign: 'center' }}>Access Restricted</Text>
                    <Text style={{ fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22 }}>
                        Your role does not have permission to access File Manager.
                    </Text>
                </View>
            </SafeAreaView>
        )
    }

    const [items,        setItems]        = useState<FmItem[]>([])
    const [breadcrumbs,  setBreadcrumbs]  = useState<FmBreadcrumb[]>([])
    const [currentDirId, setCurrentDirId] = useState<string | null>(null)
    const [loading,      setLoading]      = useState(true)
    const [refreshing,   setRefreshing]   = useState(false)

    // upload
    const [uploadPickerOpen, setUploadPickerOpen] = useState(false)
    const [uploading,        setUploading]        = useState(false)

    // new folder
    const [folderModalOpen,  setFolderModalOpen]  = useState(false)
    const [folderName,       setFolderName]       = useState('')
    const [creatingFolder,   setCreatingFolder]   = useState(false)

    // detail sheet
    const [selectedFile, setSelectedFile] = useState<FmItem | null>(null)
    const [detailOpen,   setDetailOpen]   = useState(false)
    const [deleting,     setDeleting]     = useState(false)
    const [downloading,  setDownloading]  = useState(false)
    const detailSlide    = useRef(new Animated.Value(900)).current
    const detailBackdrop = useRef(new Animated.Value(0)).current

    const openDetail = useCallback((file: FmItem) => {
        setSelectedFile(file)
        detailSlide.setValue(900)
        detailBackdrop.setValue(0)
        setDetailOpen(true)
    }, [])

    const closeDetail = useCallback(() => {
        Animated.parallel([
            Animated.timing(detailSlide,    { toValue: 900, duration: 220, useNativeDriver: true }),
            Animated.timing(detailBackdrop, { toValue: 0,   duration: 180, useNativeDriver: true }),
        ]).start(() => { setDetailOpen(false); setSelectedFile(null) })
    }, [])

    // ── load ──────────────────────────────────────────────────────────────────
    const load = useCallback(async (dirId: string | null, showLoader = false) => {
        if (showLoader) setLoading(true)
        try {
            const res = await apiGetFileList(dirId)
            setItems(res.data?.data?.list ?? [])
            setBreadcrumbs(res.data?.data?.directory ?? [])
        } catch {
            setItems([])
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => { load(null, true) }, [load])

    const onRefresh = useCallback(() => { setRefreshing(true); load(currentDirId) }, [load, currentDirId])

    // ── navigation ────────────────────────────────────────────────────────────
    const navigateTo = useCallback((dirId: string) => {
        setCurrentDirId(dirId)
        load(dirId, true)
    }, [load])

    const navigateRoot = useCallback(() => {
        setCurrentDirId(null)
        load(null, true)
    }, [load])

    const navigateToBreadcrumb = useCallback((breadcrumb: FmBreadcrumb, idx: number) => {
        if (idx === breadcrumbs.length - 1) return
        setCurrentDirId(breadcrumb.id)
        load(breadcrumb.id, true)
    }, [load, breadcrumbs.length])

    const handleItemPress = useCallback((item: FmItem) => {
        if (item.fileType === 'directory') navigateTo(item.id)
        else openDetail(item)
    }, [navigateTo, openDetail])

    // ── download (token-based, no auth needed on the download URL) ────────────
    const handleDownload = useCallback(async (file: FmItem) => {
        setDownloading(true)
        try {
            const res = await apiGetDownloadToken(file.id)
            const url = getTokenDownloadUrl(baseUrl, res.data.data.token)
            await Linking.openURL(url)
        } catch {
            Alert.alert('Error', 'Could not prepare download link. Please try again.')
        } finally {
            setDownloading(false)
        }
    }, [baseUrl])

    // ── upload ────────────────────────────────────────────────────────────────
    const uploadFile = async (file: { uri: string; name: string; type: string }) => {
        setUploadPickerOpen(false)
        setUploading(true)
        try {
            const res = await apiUploadFile(file, currentDirId)
            const newItems = res.data.data.items
            setItems(prev => [...newItems, ...prev])
        } catch {
            Alert.alert('Upload Failed', 'Could not upload the file. Please try again.')
        } finally {
            setUploading(false)
        }
    }

    const handlePickCamera = async () => {
        const perm = await ImagePicker.requestCameraPermissionsAsync()
        if (!perm.granted) {
            Alert.alert('Permission Required', 'Camera access is needed to take photos.')
            return
        }
        setUploadPickerOpen(false)
        const result = await ImagePicker.launchCameraAsync({ quality: 0.8, mediaTypes: ImagePicker.MediaTypeOptions.Images })
        if (!result.canceled && result.assets[0]) {
            const a = result.assets[0]
            await uploadFile({ uri: a.uri, name: a.fileName ?? `photo_${Date.now()}.jpg`, type: a.mimeType ?? 'image/jpeg' })
        }
    }

    const handlePickLibrary = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (!perm.granted) {
            Alert.alert('Permission Required', 'Photo library access is needed.')
            return
        }
        setUploadPickerOpen(false)
        const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ImagePicker.MediaTypeOptions.All })
        if (!result.canceled && result.assets[0]) {
            const a = result.assets[0]
            await uploadFile({ uri: a.uri, name: a.fileName ?? `image_${Date.now()}.jpg`, type: a.mimeType ?? 'image/jpeg' })
        }
    }

    const handlePickDocument = async () => {
        setUploadPickerOpen(false)
        const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true })
        if (!result.canceled && result.assets[0]) {
            const a = result.assets[0]
            await uploadFile({ uri: a.uri, name: a.name, type: a.mimeType ?? 'application/octet-stream' })
        }
    }

    // ── create folder ─────────────────────────────────────────────────────────
    const openFolderModal = () => {
        setFolderName('')
        setFolderModalOpen(true)
    }

    const handleCreateFolder = async () => {
        if (!folderName.trim()) return
        setCreatingFolder(true)
        try {
            const res = await apiCreateDirectory({ name: folderName.trim(), parent_id: currentDirId })
            const newDir = res.data.data.item
            setItems(prev => [newDir, ...prev])
            setFolderModalOpen(false)
        } catch {
            Alert.alert('Error', 'Could not create folder. Please try again.')
        } finally {
            setCreatingFolder(false)
        }
    }

    // ── delete file ───────────────────────────────────────────────────────────
    const handleDelete = async (file: FmItem) => {
        Alert.alert(
            'Delete File',
            `Delete "${file.name}"? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive',
                    onPress: async () => {
                        setDeleting(true)
                        try {
                            await apiDeleteFile(file.id)
                            setItems(prev => prev.filter(i => i.id !== file.id))
                            closeDetail()
                        } catch {
                            Alert.alert('Error', 'Could not delete the file.')
                        } finally {
                            setDeleting(false)
                        }
                    },
                },
            ],
        )
    }

    // ── delete folder (long-press) ────────────────────────────────────────────
    const handleDeleteDirectory = useCallback((dir: FmItem) => {
        Alert.alert(
            'Delete Folder',
            `Delete "${dir.name}" and all its contents? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiDeleteDirectory(dir.id)
                            setItems(prev => prev.filter(i => i.id !== dir.id))
                        } catch {
                            Alert.alert('Error', 'Could not delete the folder.')
                        }
                    },
                },
            ],
        )
    }, [])

    const handleLongPress = useCallback((item: FmItem) => {
        if (item.fileType === 'directory' && hasWrite) handleDeleteDirectory(item)
    }, [hasWrite, handleDeleteDirectory])

    const renderItem = useCallback(({ item }: { item: FmItem }) => (
        <FileItemCard
            item={item}
            onPress={handleItemPress}
            onLongPress={item.fileType === 'directory' && hasWrite ? handleLongPress : undefined}
        />
    ), [handleItemPress, handleLongPress, hasWrite])

    const dirs  = items.filter(i => i.fileType === 'directory')
    const files = items.filter(i => i.fileType !== 'directory')

    return (
        <SafeAreaView style={s.safe} edges={['top']}>

            {/* Header */}
            <View style={s.header}>
                {currentDirId ? (
                    <TouchableOpacity
                        style={s.backBtn}
                        onPress={() => {
                            if (breadcrumbs.length <= 1) navigateRoot()
                            else {
                                const parent = breadcrumbs[breadcrumbs.length - 2]
                                navigateToBreadcrumb(parent, breadcrumbs.length - 2)
                            }
                        }}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={20} color="#111" />
                    </TouchableOpacity>
                ) : (
                    <View style={s.headerIcon}>
                        <Ionicons name="folder-open-outline" size={20} color="#06b6d4" />
                    </View>
                )}
                <Text style={s.headerTitle} numberOfLines={1}>
                    {breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].label : 'File Manager'}
                </Text>
                {hasWrite && (
                    <TouchableOpacity
                        style={s.folderBtn}
                        onPress={openFolderModal}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="folder-open-outline" size={18} color="#f59e0b" />
                    </TouchableOpacity>
                )}
                {hasWrite && (
                    <TouchableOpacity
                        style={s.uploadBtn}
                        onPress={() => setUploadPickerOpen(true)}
                        activeOpacity={0.8}
                        disabled={uploading}
                    >
                        {uploading
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                        }
                    </TouchableOpacity>
                )}
            </View>

            {/* Breadcrumb */}
            {breadcrumbs.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.breadcrumbWrap} contentContainerStyle={s.breadcrumbContent}>
                    <TouchableOpacity onPress={navigateRoot} activeOpacity={0.7}>
                        <Text style={s.breadcrumbRoot}>Root</Text>
                    </TouchableOpacity>
                    {breadcrumbs.map((bc, idx) => (
                        <View key={bc.id} style={s.breadcrumbSegment}>
                            <Ionicons name="chevron-forward" size={12} color="#bbb" />
                            <TouchableOpacity onPress={() => navigateToBreadcrumb(bc, idx)} activeOpacity={0.7}>
                                <Text style={[s.breadcrumbLabel, idx === breadcrumbs.length - 1 && s.breadcrumbActive]}>
                                    {bc.label}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </ScrollView>
            )}

            {/* Stats row */}
            {!loading && items.length > 0 && (
                <View style={s.statsRow}>
                    <Text style={s.statsText}>{dirs.length} folders · {files.length} files</Text>
                    {hasWrite && dirs.length > 0 && (
                        <Text style={s.statsHint}>Long-press a folder to delete it</Text>
                    )}
                </View>
            )}

            {/* Uploading banner */}
            {uploading && (
                <View style={s.uploadingBanner}>
                    <ActivityIndicator size="small" color="#06b6d4" />
                    <Text style={s.uploadingText}>Uploading…</Text>
                </View>
            )}

            {/* List */}
            {loading ? (
                <ActivityIndicator size="large" color="#111" style={{ marginTop: 60 }} />
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={s.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#111" />}
                    ListEmptyComponent={
                        <View style={s.emptyWrap}>
                            <View style={s.emptyIconWrap}>
                                <Ionicons name="folder-open-outline" size={32} color="#ccc" />
                            </View>
                            <Text style={s.emptyTitle}>This folder is empty</Text>
                            <Text style={s.emptySubtitle}>
                                {hasWrite ? 'Tap the upload or folder button to add content' : 'No files or folders here yet'}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* ── DETAIL SHEET ── */}
            <Modal
                visible={detailOpen}
                transparent
                statusBarTranslucent
                animationType="none"
                onRequestClose={closeDetail}
                onShow={() => {
                    Animated.parallel([
                        Animated.spring(detailSlide,    { toValue: 0, bounciness: 0, speed: 20, useNativeDriver: true }),
                        Animated.timing(detailBackdrop, { toValue: 1, duration: 200, useNativeDriver: true }),
                    ]).start()
                }}
            >
                <View style={{ flex: 1 }}>
                    <Animated.View style={[StyleSheet.absoluteFillObject, s.backdrop, { opacity: detailBackdrop }]}>
                        <Pressable style={StyleSheet.absoluteFillObject} onPress={closeDetail} />
                    </Animated.View>

                    <Animated.View style={[s.sheet, { paddingBottom: insets.bottom + 20, transform: [{ translateY: detailSlide }] }]}>
                        {selectedFile && (
                            <FileDetailContent
                                file={selectedFile}
                                hasWrite={hasWrite}
                                deleting={deleting}
                                downloading={downloading}
                                onClose={closeDetail}
                                onDownload={handleDownload}
                                onDelete={handleDelete}
                            />
                        )}
                    </Animated.View>
                </View>
            </Modal>

            {/* ── UPLOAD PICKER SHEET ── */}
            <Modal visible={uploadPickerOpen} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setUploadPickerOpen(false)}>
                <RNTouchableOpacity style={s.pickerOverlay} activeOpacity={1} onPress={() => setUploadPickerOpen(false)} />
                <View style={[s.pickerSheet, { paddingBottom: insets.bottom + 16 }]}>
                    <View style={s.handle} />
                    <Text style={s.pickerTitle}>Upload File</Text>

                    <RNTouchableOpacity style={s.pickerRow} onPress={handlePickCamera} activeOpacity={0.75}>
                        <View style={[s.pickerIconWrap, { backgroundColor: '#10b98118' }]}>
                            <Ionicons name="camera-outline" size={22} color="#10b981" />
                        </View>
                        <View style={s.pickerTexts}>
                            <Text style={s.pickerLabel}>Take Photo</Text>
                            <Text style={s.pickerSub}>Use your camera</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#ccc" />
                    </RNTouchableOpacity>

                    <RNTouchableOpacity style={s.pickerRow} onPress={handlePickLibrary} activeOpacity={0.75}>
                        <View style={[s.pickerIconWrap, { backgroundColor: '#8b5cf618' }]}>
                            <Ionicons name="image-outline" size={22} color="#8b5cf6" />
                        </View>
                        <View style={s.pickerTexts}>
                            <Text style={s.pickerLabel}>Photo Library</Text>
                            <Text style={s.pickerSub}>Choose from your photos</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#ccc" />
                    </RNTouchableOpacity>

                    <RNTouchableOpacity style={s.pickerRow} onPress={handlePickDocument} activeOpacity={0.75}>
                        <View style={[s.pickerIconWrap, { backgroundColor: '#f59e0b18' }]}>
                            <Ionicons name="document-outline" size={22} color="#f59e0b" />
                        </View>
                        <View style={s.pickerTexts}>
                            <Text style={s.pickerLabel}>Browse Files</Text>
                            <Text style={s.pickerSub}>PDF, Word, Excel and more</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#ccc" />
                    </RNTouchableOpacity>

                    <RNTouchableOpacity style={s.pickerCancelBtn} onPress={() => setUploadPickerOpen(false)} activeOpacity={0.7}>
                        <Text style={s.pickerCancelText}>Cancel</Text>
                    </RNTouchableOpacity>
                </View>
            </Modal>

            {/* ── NEW FOLDER MODAL ── */}
            <Modal visible={folderModalOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => !creatingFolder && setFolderModalOpen(false)}>
                <Pressable style={s.folderOverlay} onPress={() => !creatingFolder && setFolderModalOpen(false)}>
                    <Pressable style={s.folderModal} onPress={e => e.stopPropagation()}>
                        <Text style={s.folderModalTitle}>New Folder</Text>
                        <TextInput
                            style={s.folderInput}
                            placeholder="Folder name"
                            placeholderTextColor="#bbb"
                            value={folderName}
                            onChangeText={setFolderName}
                            autoFocus
                            returnKeyType="done"
                            onSubmitEditing={handleCreateFolder}
                        />
                        <View style={s.folderModalBtns}>
                            <RNTouchableOpacity style={s.folderCancelBtn} onPress={() => setFolderModalOpen(false)} disabled={creatingFolder} activeOpacity={0.7}>
                                <Text style={s.folderCancelText}>Cancel</Text>
                            </RNTouchableOpacity>
                            <RNTouchableOpacity
                                style={[s.folderCreateBtn, (!folderName.trim() || creatingFolder) && { opacity: 0.4 }]}
                                onPress={handleCreateFolder}
                                disabled={!folderName.trim() || creatingFolder}
                                activeOpacity={0.85}
                            >
                                {creatingFolder
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <Text style={s.folderCreateText}>Create</Text>
                                }
                            </RNTouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

        </SafeAreaView>
    )
}

// ── Detail Content ────────────────────────────────────────────────────────────

function FileDetailContent({
    file, hasWrite, deleting, downloading, onClose, onDownload, onDelete,
}: {
    file: FmItem
    hasWrite: boolean
    deleting: boolean
    downloading: boolean
    onClose: () => void
    onDownload: (file: FmItem) => void
    onDelete: (file: FmItem) => void
}) {
    const style = getFileStyle(file.fileType)

    return (
        <>
            <View style={s.handle} />
            <View style={s.sheetTitleRow}>
                <View style={[s.fileIconSm, { backgroundColor: style.bg }]}>
                    <Ionicons name={style.icon as never} size={18} color={style.color} />
                </View>
                <Text style={s.sheetTitle} numberOfLines={2}>{file.name}</Text>
                <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.7}>
                    <Ionicons name="close" size={18} color="#555" />
                </TouchableOpacity>
            </View>

            <View style={s.divider} />

            <DetailRow icon="document-outline"   label="Type"        value={file.fileType.toUpperCase()} />
            <DetailRow icon="cellular-outline"   label="Size"        value={formatSize(file.size)} />
            <DetailRow icon="person-outline"     label="Uploaded by" value={file.author?.name ?? '—'} />
            <DetailRow icon="calendar-outline"   label="Date"        value={formatDate(file.uploadDate)} />

            <View style={s.divider} />

            <TouchableOpacity
                style={[s.downloadBtn, downloading && { opacity: 0.7 }]}
                onPress={() => onDownload(file)}
                disabled={downloading}
                activeOpacity={0.85}
            >
                {downloading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Ionicons name="download-outline" size={20} color="#fff" />
                }
                <Text style={s.downloadText}>{downloading ? 'Preparing…' : 'Open / Download'}</Text>
            </TouchableOpacity>

            {hasWrite && (
                <TouchableOpacity
                    style={[s.deleteBtn, deleting && { opacity: 0.6 }]}
                    onPress={() => onDelete(file)}
                    disabled={deleting}
                    activeOpacity={0.85}
                >
                    {deleting
                        ? <ActivityIndicator size="small" color="#ff6a55" />
                        : <>
                            <Ionicons name="trash-outline" size={18} color="#ff6a55" />
                            <Text style={s.deleteBtnText}>Delete File</Text>
                        </>
                    }
                </TouchableOpacity>
            )}
        </>
    )
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
        <View style={s.detailRow}>
            <Ionicons name={icon as never} size={16} color="#bbb" style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
                <Text style={s.detailRowLabel}>{label}</Text>
                <Text style={s.detailRowValue}>{value}</Text>
            </View>
        </View>
    )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f5f5f5' },

    header: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingHorizontal: 20, paddingVertical: 14,
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    },
    headerIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#cffafe', alignItems: 'center', justifyContent: 'center' },
    backBtn:    { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ebebeb' },
    headerTitle:{ fontSize: 18, fontWeight: '800', color: '#111', flex: 1 },
    folderBtn:  { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fde68a' },
    uploadBtn:  { width: 36, height: 36, borderRadius: 10, backgroundColor: '#06b6d4', alignItems: 'center', justifyContent: 'center' },

    breadcrumbWrap:    { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', maxHeight: 44 },
    breadcrumbContent: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 4 },
    breadcrumbRoot:    { fontSize: 13, fontWeight: '600', color: '#06b6d4' },
    breadcrumbSegment: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    breadcrumbLabel:   { fontSize: 13, fontWeight: '500', color: '#888' },
    breadcrumbActive:  { color: '#111', fontWeight: '700' },

    statsRow:     { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    statsText:    { fontSize: 12, fontWeight: '600', color: '#bbb' },
    statsHint:    { fontSize: 11, color: '#ddd', fontStyle: 'italic' },

    uploadingBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#cffafe', paddingHorizontal: 20, paddingVertical: 10,
    },
    uploadingText: { fontSize: 13, fontWeight: '600', color: '#0891b2' },

    listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20, gap: 8 },

    card: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: '#fff', borderRadius: 14,
        borderWidth: 1, borderColor: '#efefef', padding: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    },
    fileIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    cardInfo: { flex: 1 },
    cardName: { fontSize: 15, fontWeight: '600', color: '#111', lineHeight: 20, marginBottom: 4 },
    cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 12, color: '#bbb', fontWeight: '500' },
    metaDot:  { fontSize: 12, color: '#ddd' },

    emptyWrap:    { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyIconWrap:{ width: 72, height: 72, borderRadius: 20, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
    emptyTitle:   { fontSize: 15, fontWeight: '700', color: '#555' },
    emptySubtitle:{ fontSize: 13, color: '#bbb', textAlign: 'center' },

    /* Detail sheet */
    backdrop: { backgroundColor: 'rgba(0,0,0,0.52)' },
    sheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: 24, paddingTop: 14, maxHeight: '90%',
    },
    handle:       { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e0e0e0', alignSelf: 'center', marginBottom: 16 },
    sheetTitleRow:{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
    fileIconSm:   { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    sheetTitle:   { fontSize: 16, fontWeight: '700', color: '#111', flex: 1, lineHeight: 22 },
    closeBtn:     { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ebebeb', flexShrink: 0 },
    divider:      { height: 1, backgroundColor: '#f0f0f0', marginVertical: 16 },

    detailRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
    detailRowLabel: { fontSize: 11, color: '#aaa', fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
    detailRowValue: { fontSize: 14, color: '#111', fontWeight: '500' },

    downloadBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        height: 52, borderRadius: 14, backgroundColor: '#06b6d4',
        shadowColor: '#06b6d4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    downloadText: { fontSize: 15, fontWeight: '800', color: '#fff' },

    deleteBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        height: 48, borderRadius: 14, backgroundColor: '#ff6a5510',
        borderWidth: 1, borderColor: '#ff6a5530', marginTop: 10,
    },
    deleteBtnText: { fontSize: 14, fontWeight: '700', color: '#ff6a55' },

    /* Upload picker sheet */
    pickerOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
    pickerSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingHorizontal: 24, paddingTop: 14,
    },
    pickerTitle:    { fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 16 },
    pickerRow: {
        flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
    },
    pickerIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    pickerTexts:    { flex: 1 },
    pickerLabel:    { fontSize: 15, fontWeight: '700', color: '#111' },
    pickerSub:      { fontSize: 12, color: '#aaa', marginTop: 2 },
    pickerCancelBtn:  { marginTop: 16, height: 52, borderRadius: 14, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
    pickerCancelText: { fontSize: 15, fontWeight: '700', color: '#666' },

    /* New folder modal */
    folderOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center', justifyContent: 'center', padding: 24,
    },
    folderModal: {
        backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%',
    },
    folderModalTitle: { fontSize: 17, fontWeight: '800', color: '#111', marginBottom: 16 },
    folderInput: {
        borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 12,
        fontSize: 15, color: '#111', marginBottom: 20,
    },
    folderModalBtns:  { flexDirection: 'row', gap: 10 },
    folderCancelBtn: {
        flex: 1, height: 46, borderRadius: 12,
        backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center',
    },
    folderCancelText: { fontSize: 14, fontWeight: '700', color: '#555' },
    folderCreateBtn: {
        flex: 1, height: 46, borderRadius: 12,
        backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center',
    },
    folderCreateText: { fontSize: 14, fontWeight: '700', color: '#fff' },
})
