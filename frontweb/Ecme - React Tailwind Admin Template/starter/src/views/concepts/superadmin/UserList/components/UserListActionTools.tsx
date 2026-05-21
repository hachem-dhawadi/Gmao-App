import { useState } from 'react'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Switcher from '@/components/ui/Switcher'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { TbUserPlus, TbCloudDownload, TbUser, TbMail, TbPhone, TbLock, TbShield } from 'react-icons/tb'
import { CSVLink } from 'react-csv'
import useUserList from '../hooks/useUserList'
import { apiCreateSuperadminUser } from '@/services/CompaniesService'

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{children}</span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
    </div>
)

const AddUserDialog = ({
    isOpen,
    onClose,
    onCreated,
}: {
    isOpen: boolean
    onClose: () => void
    onCreated: () => void
}) => {
    const [name, setName]                       = useState('')
    const [email, setEmail]                     = useState('')
    const [phone, setPhone]                     = useState('')
    const [password, setPassword]               = useState('')
    const [passwordConfirm, setPasswordConfirm] = useState('')
    const [isActive, setIsActive]               = useState(true)
    const [isSuperadmin, setIsSuperadmin]       = useState(false)
    const [loading, setLoading]                 = useState(false)

    const reset = () => {
        setName(''); setEmail(''); setPhone('')
        setPassword(''); setPasswordConfirm('')
        setIsActive(true); setIsSuperadmin(false)
    }

    const handleClose = () => { reset(); onClose() }

    const handleSave = async () => {
        if (!name || !email || !password || !passwordConfirm) {
            toast.push(
                <Notification type="warning">Name, email and password are required.</Notification>,
                { placement: 'top-center' },
            )
            return
        }
        if (password !== passwordConfirm) {
            toast.push(
                <Notification type="warning">Passwords do not match.</Notification>,
                { placement: 'top-center' },
            )
            return
        }
        setLoading(true)
        try {
            await apiCreateSuperadminUser({
                name,
                email,
                phone: phone || null,
                password,
                password_confirmation: passwordConfirm,
                is_active: isActive,
                is_superadmin: isSuperadmin,
            })
            toast.push(
                <Notification type="success">User created successfully.</Notification>,
                { placement: 'top-center' },
            )
            onCreated()
            handleClose()
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to create user.'
            toast.push(
                <Notification type="danger">{msg}</Notification>,
                { placement: 'top-center' },
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog
            isOpen={isOpen}
            onClose={handleClose}
            onRequestClose={handleClose}
            width={560}
        >
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl">
                    <TbUserPlus />
                </div>
                <div>
                    <h5 className="font-bold">Add New User</h5>
                    <p className="text-sm text-gray-400">Create a platform account</p>
                </div>
            </div>

            <div className="flex flex-col gap-5">
                {/* Basic Info */}
                <div>
                    <SectionTitle>Account Info</SectionTitle>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-medium mb-1">
                                Name <span className="text-red-500">*</span>
                            </label>
                            <Input
                                prefix={<TbUser className="text-gray-400" />}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Full name"
                            />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-medium mb-1">
                                Email <span className="text-red-500">*</span>
                            </label>
                            <Input
                                prefix={<TbMail className="text-gray-400" />}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="email@example.com"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1">
                                Phone <span className="text-gray-400 text-xs font-normal">(optional)</span>
                            </label>
                            <Input
                                prefix={<TbPhone className="text-gray-400" />}
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+1 234 567 8900"
                            />
                        </div>
                    </div>
                </div>

                {/* Password */}
                <div>
                    <SectionTitle>Password</SectionTitle>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Password <span className="text-red-500">*</span>
                            </label>
                            <Input
                                type="password"
                                prefix={<TbLock className="text-gray-400" />}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Min. 8 chars"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Confirm <span className="text-red-500">*</span>
                            </label>
                            <Input
                                type="password"
                                prefix={<TbLock className="text-gray-400" />}
                                value={passwordConfirm}
                                onChange={(e) => setPasswordConfirm(e.target.value)}
                                placeholder="Repeat password"
                            />
                        </div>
                    </div>
                </div>

                {/* Permissions */}
                <div>
                    <SectionTitle>Permissions</SectionTitle>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
                        <div className="flex items-center justify-between px-4 py-3">
                            <div>
                                <p className="text-sm font-medium">Active account</p>
                                <p className="text-xs text-gray-400">User can log in to the platform</p>
                            </div>
                            <Switcher checked={isActive} onChange={(val) => setIsActive(val)} />
                        </div>
                        <div className="flex items-center justify-between px-4 py-3">
                            <div className="flex items-center gap-2">
                                <TbShield className="text-purple-500" />
                                <div>
                                    <p className="text-sm font-medium">Superadmin</p>
                                    <p className="text-xs text-gray-400">Full platform access</p>
                                </div>
                            </div>
                            <Switcher checked={isSuperadmin} onChange={(val) => setIsSuperadmin(val)} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button size="sm" onClick={handleClose}>Cancel</Button>
                <Button size="sm" variant="solid" loading={loading} onClick={handleSave}>
                    Create User
                </Button>
            </div>
        </Dialog>
    )
}

const UserListActionTools = () => {
    const { customerList, mutate } = useUserList()
    const [addOpen, setAddOpen] = useState(false)

    return (
        <div className="flex flex-col md:flex-row gap-3">
            <CSVLink className="w-full" filename="userList.csv" data={customerList}>
                <Button icon={<TbCloudDownload className="text-xl" />} className="w-full">
                    Download
                </Button>
            </CSVLink>
            <Button
                variant="solid"
                icon={<TbUserPlus className="text-xl" />}
                onClick={() => setAddOpen(true)}
            >
                Add User
            </Button>
            <AddUserDialog
                isOpen={addOpen}
                onClose={() => setAddOpen(false)}
                onCreated={() => mutate()}
            />
        </div>
    )
}

export default UserListActionTools
