import { useMemo, useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import Upload from '@/components/ui/Upload'
import Input from '@/components/ui/Input'
import Select, { Option as DefaultOption } from '@/components/ui/Select'
import Avatar from '@/components/ui/Avatar'
import { Form, FormItem } from '@/components/ui/Form'
import NumericInput from '@/components/shared/NumericInput'
import { countryList } from '@/constants/countries.constant'
import { components } from 'react-select'
import type { ControlProps, OptionProps } from 'react-select'
import { apiGetSettingsProfile } from '@/services/AccontsService'
import { apiUpdateProfile } from '@/services/AuthService'
import { useSessionUser } from '@/store/authStore'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import useSWR from 'swr'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { HiOutlineUser } from 'react-icons/hi'
import { TbPlus } from 'react-icons/tb'
import type { ZodType } from 'zod'
import type { GetSettingsProfileResponse } from '../types'

type ProfileSchema = {
    firstName: string
    lastName: string
    email: string
    dialCode: string
    phoneNumber: string
    img: string
}

type CountryOption = {
    label: string
    dialCode: string
    value: string
}

const { Control } = components

const validationSchema: ZodType<ProfileSchema> = z.object({
    firstName: z.string().min(1, { message: 'First name required' }),
    lastName: z.string().min(1, { message: 'Last name required' }),
    email: z
        .string()
        .min(1, { message: 'Email required' })
        .email({ message: 'Invalid email' }),
    dialCode: z.string().min(1, { message: 'Please select your country code' }),
    phoneNumber: z
        .string()
        .min(1, { message: 'Please input your mobile number' }),
    img: z.string(),
})

const formatDateTime = (value?: string) => {
    if (!value) {
        return '-'
    }

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
        return value
    }

    return parsed.toLocaleString()
}

const buildPhone = (dialCode: string, phoneNumber: string): string => {
    const dialDigits = (dialCode || '').replace(/[^\d]/g, '')
    const formattedDial = dialDigits ? `+${dialDigits}` : ''
    const rawPhone = (phoneNumber || '').trim()

    if (!rawPhone) {
        return ''
    }

    const phoneDigits = rawPhone.replace(/[^\d]/g, '')
    if (!phoneDigits) {
        return ''
    }

    if (formattedDial) {
        const localDigits = phoneDigits.startsWith(dialDigits)
            ? phoneDigits.slice(dialDigits.length)
            : phoneDigits
        return `${formattedDial}${localDigits ? ` ${localDigits}` : ''}`
    }

    return rawPhone.startsWith('+') ? `+${phoneDigits}` : phoneDigits
}

const CustomSelectOption = (props: OptionProps<CountryOption>) => {
    return (
        <DefaultOption<CountryOption>
            {...props}
            customLabel={(data) => (
                <span className="flex items-center gap-2">
                    <Avatar
                        shape="circle"
                        size={20}
                        src={`/img/countries/${data.value}.png`}
                    />
                    <span>{data.dialCode}</span>
                </span>
            )}
        />
    )
}

const CustomControl = ({ children, ...props }: ControlProps<CountryOption>) => {
    const selected = props.getValue()[0]
    return (
        <Control {...props}>
            {selected && (
                <Avatar
                    className="ltr:ml-4 rtl:mr-4"
                    shape="circle"
                    size={20}
                    src={`/img/countries/${selected.value}.png`}
                />
            )}
            {children}
        </Control>
    )
}

const SettingsProfile = () => {
    const setUser = useSessionUser((state) => state.setUser)
    const currentUserId = useSessionUser((state) => state.user.userId)
    const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null)
    const [removeAvatar, setRemoveAvatar] = useState(false)
    const profileSwrKey = currentUserId
        ? `/api/settings/profile/${currentUserId}`
        : null

    const { data, mutate } = useSWR(
        profileSwrKey,
        () => apiGetSettingsProfile<GetSettingsProfileResponse>(),
        {
            revalidateOnFocus: false,
            revalidateIfStale: true,
            revalidateOnReconnect: false,
            revalidateOnMount: true,
        },
    )
    const dialCodeList = useMemo(() => {
        const newCountryList: Array<CountryOption> = JSON.parse(
            JSON.stringify(countryList),
        )

        return newCountryList.map((country) => {
            country.label = country.dialCode
            return country
        })
    }, [])

    const beforeUpload = (files: FileList | null) => {
        let valid: string | boolean = true

        const allowedFileType = ['image/jpeg', 'image/png']
        if (files) {
            for (const file of files) {
                if (!allowedFileType.includes(file.type)) {
                    valid = 'Please upload a .jpeg or .png file!'
                }
            }
        }

        return valid
    }

    const {
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
        control,
    } = useForm<ProfileSchema>({
        resolver: zodResolver(validationSchema),
    })

    useEffect(() => {
        if (data) {
            setSelectedAvatarFile(null)
            setRemoveAvatar(false)
            reset({
                firstName: data.firstName || '',
                lastName: data.lastName || '',
                email: data.email || '',
                dialCode: data.dialCode || '',
                phoneNumber: data.phoneNumber || '',
                img: data.img || '',
            })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data])

    const onSubmit = async (values: ProfileSchema) => {
        const name = `${values.firstName} ${values.lastName}`.trim()
        const phone = buildPhone(values.dialCode, values.phoneNumber)

        try {
            const response = await apiUpdateProfile({
                name,
                email: values.email,
                phone,
                locale: data?.locale || null,
                avatarFile: selectedAvatarFile,
                removeAvatar,
            })

            const updatedUser = response?.data?.user
            const updatedAvatar =
                updatedUser?.avatar_url || updatedUser?.avatar_path || ''

            setUser({
                userName: updatedUser?.name || name,
                email: updatedUser?.email || values.email,
                phone: updatedUser?.phone || phone,
                avatar: updatedAvatar,
            })

            await mutate()

            toast.push(
                <Notification type="success">Profile updated successfully.</Notification>,
                { placement: 'top-center' },
            )
        } catch (error: unknown) {
            const message =
                (error as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message || 'Failed to update profile.'

            toast.push(<Notification type="danger">{message}</Notification>, {
                placement: 'top-center',
            })
        }
    }

    const statusLabel = data?.isActive ? 'Active' : 'Inactive'
    const statusDotClass = data?.isActive ? 'bg-emerald-500' : 'bg-gray-400'
    const statusTextClass = data?.isActive ? 'text-emerald-600' : 'text-gray-500'

    return (
        <>
            <h4 className="mb-8">Personal information</h4>
            <Form onSubmit={handleSubmit(onSubmit)}>
                <div className="mb-8">
                    <Controller
                        name="img"
                        control={control}
                        render={({ field }) => (
                            <div className="flex items-center gap-4">
                                <Avatar
                                    size={90}
                                    className="border-4 border-white bg-gray-100 text-gray-300 shadow-lg"
                                    icon={<HiOutlineUser />}
                                    src={field.value}
                                />
                                <div className="flex items-center gap-2">
                                    <Upload
                                        showList={false}
                                        uploadLimit={1}
                                        beforeUpload={beforeUpload}
                                        onChange={(files) => {
                                            if (files.length > 0) {
                                                setSelectedAvatarFile(files[0])
                                                setRemoveAvatar(false)
                                                field.onChange(
                                                    URL.createObjectURL(files[0]),
                                                )
                                            }
                                        }}
                                    >
                                        <Button
                                            variant="solid"
                                            size="sm"
                                            type="button"
                                            icon={<TbPlus />}
                                        >
                                            Upload Image
                                        </Button>
                                    </Upload>
                                    <Button
                                        size="sm"
                                        type="button"
                                        onClick={() => {
                                            setSelectedAvatarFile(null)
                                            setRemoveAvatar(true)
                                            field.onChange('')
                                        }}
                                    >
                                        Remove
                                    </Button>
                                </div>
                            </div>
                        )}
                    />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                    <FormItem
                        label="First name"
                        invalid={Boolean(errors.firstName)}
                        errorMessage={errors.firstName?.message}
                    >
                        <Controller
                            name="firstName"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="text"
                                    autoComplete="off"
                                    placeholder="First Name"
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                    <FormItem
                        label="User name"
                        invalid={Boolean(errors.lastName)}
                        errorMessage={errors.lastName?.message}
                    >
                        <Controller
                            name="lastName"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="text"
                                    autoComplete="off"
                                    placeholder="Last Name"
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                </div>
                <FormItem
                    label="Email"
                    invalid={Boolean(errors.email)}
                    errorMessage={errors.email?.message}
                >
                    <Controller
                        name="email"
                        control={control}
                        render={({ field }) => (
                            <Input
                                type="email"
                                autoComplete="off"
                                placeholder="Email"
                                {...field}
                            />
                        )}
                    />
                </FormItem>
                <div className="flex items-end gap-4 w-full mb-6">
                    <FormItem
                        invalid={Boolean(errors.phoneNumber) || Boolean(errors.dialCode)}
                    >
                        <label className="form-label mb-2">Phone number</label>
                        <Controller
                            name="dialCode"
                            control={control}
                            render={({ field }) => (
                                <Select<CountryOption>
                                    options={dialCodeList}
                                    {...field}
                                    className="w-[150px]"
                                    components={{
                                        Option: (props) => (
                                            <CustomSelectOption
                                                {...(props as OptionProps<CountryOption>)}
                                            />
                                        ),
                                        Control: CustomControl,
                                    }}
                                    placeholder=""
                                    value={dialCodeList.filter(
                                        (option) => option.dialCode === field.value,
                                    )}
                                    onChange={(option) =>
                                        field.onChange(option?.dialCode)
                                    }
                                />
                            )}
                        />
                    </FormItem>
                    <FormItem
                        className="w-full"
                        invalid={Boolean(errors.phoneNumber) || Boolean(errors.dialCode)}
                        errorMessage={errors.phoneNumber?.message}
                    >
                        <Controller
                            name="phoneNumber"
                            control={control}
                            render={({ field }) => (
                                <NumericInput
                                    autoComplete="off"
                                    placeholder="Phone Number"
                                    value={field.value}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                />
                            )}
                        />
                    </FormItem>
                </div>

                <h4 className="mb-6">Other information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormItem label="Locale">
                        <Input value={data?.locale || '-'} readOnly />
                    </FormItem>
                    <FormItem label="Account status">
                        <div className="h-11 px-3 border border-gray-300 dark:border-gray-600 rounded-md flex items-center">
                            <span className={`h-2.5 w-2.5 rounded-full mr-2 ${statusDotClass}`} />
                            <span className={`font-semibold ${statusTextClass}`}>{statusLabel}</span>
                        </div>
                    </FormItem>
                    <FormItem label="Last login">
                        <Input value={formatDateTime(data?.lastLoginAt)} readOnly />
                    </FormItem>
                    <FormItem label="Created at">
                        <Input value={formatDateTime(data?.createdAt)} readOnly />
                    </FormItem>
                    <FormItem label="Updated at">
                        <Input value={formatDateTime(data?.updatedAt)} readOnly />
                    </FormItem>
                </div>

                <div className="flex justify-end">
                    <Button variant="solid" type="submit" loading={isSubmitting}>
                        Save
                    </Button>
                </div>
            </Form>
        </>
    )
}

export default SettingsProfile


