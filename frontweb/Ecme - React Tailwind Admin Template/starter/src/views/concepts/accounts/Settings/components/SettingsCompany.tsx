import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Upload from '@/components/ui/Upload'
import Select, { Option as DefaultOption } from '@/components/ui/Select'
import Avatar from '@/components/ui/Avatar'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { Form, FormItem } from '@/components/ui/Form'
import {
    CURRENT_COMPANY_ID_KEY,
    OWNER_COMPANY_TAB_KEY,
} from '@/constants/app.constant'
import { countryList } from '@/constants/countries.constant'
import { apiCreateCompany, apiMe, apiUpdateCurrentCompany } from '@/services/AuthService'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { components } from 'react-select'
import {
    HiOutlineCloudUpload,
    HiOutlineOfficeBuilding,
    HiOutlineX,
} from 'react-icons/hi'
import { FcImageFile } from 'react-icons/fc'
import FileIcon from '@/components/view/FileIcon'
import fileSizeUnit from '@/utils/fileSizeUnit'
import type { ControlProps, OptionProps } from 'react-select'
import type { ZodType } from 'zod'

type CompanySchema = {
    name: string
    legalName: string
    phone: string
    email: string
    addressLine1: string
    addressLine2: string
    city: string
    postalCode: string
    country: string
    timezone: string
}

type CompanyStatus = 'in_creation' | 'pending' | 'rejected' | 'approved'

type CompanyProofFile = {
    id: number
    original_name: string
    mime_type: string | null
    size_bytes: number | null
    is_verified: boolean
    created_at: string
}

type CurrentCompany = {
    id: number
    name: string
    legal_name: string | null
    phone: string | null
    email: string | null
    address_line1: string | null
    address_line2: string | null
    city: string | null
    postal_code: string | null
    country: string | null
    logo_path: string | null
    logo_url?: string | null
    timezone: string
    is_active: boolean
    approval_status: 'pending' | 'approved' | 'rejected'
    proof_files: CompanyProofFile[]
}

type TimezoneOption = {
    value: string
    label: string
}

type CountryOption = {
    label: string
    dialCode: string
    value: string
}

const { Control } = components

const defaultValues: CompanySchema = {
    name: '',
    legalName: '',
    phone: '',
    email: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    postalCode: '',
    country: '',
    timezone: '',
}

const findCountryOption = (value?: string | null): CountryOption | undefined => {
    if (!value) {
        return undefined
    }

    const normalized = value.trim().toLowerCase()

    return countryList.find(
        (country) =>
            country.value.toLowerCase() === normalized ||
            country.label.toLowerCase() === normalized,
    )
}

const mapCompanyToForm = (company: CurrentCompany): CompanySchema => ({
    name: company.name,
    legalName: company.legal_name ?? '',
    phone: company.phone ?? '',
    email: company.email ?? '',
    addressLine1: company.address_line1 ?? '',
    addressLine2: company.address_line2 ?? '',
    city: company.city ?? '',
    postalCode: company.postal_code ?? '',
    country: findCountryOption(company.country)?.value ?? '',
    timezone: company.timezone ?? '',
})

const getSupportedTimezones = (): string[] => {
    const intlWithSupportedValues = Intl as unknown as {
        supportedValuesOf?: (key: string) => string[]
    }

    if (typeof intlWithSupportedValues.supportedValuesOf === 'function') {
        const zones = intlWithSupportedValues.supportedValuesOf('timeZone')
        if (zones.length > 0) {
            return zones
        }
    }

    return [
        'Africa/Tunis',
        'UTC',
        'Europe/Paris',
        'Europe/London',
        'America/New_York',
    ]
}

const CountryOptionItem = (props: OptionProps<CountryOption>) => {
    return (
        <DefaultOption<CountryOption>
            {...props}
            customLabel={(data, label) => (
                <span className="flex items-center gap-2">
                    <Avatar
                        shape="circle"
                        size={20}
                        src={`/img/countries/${data.value}.png`}
                    />
                    <span>{label}</span>
                </span>
            )}
        />
    )
}

const CountryControl = ({
    children,
    ...props
}: ControlProps<CountryOption>) => {
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

const getProofFileType = (fileName: string, mimeType?: string | null): string => {
    const extension = fileName.split('.').pop()?.toLowerCase() || ''

    if (extension === 'pdf') {
        return 'pdf'
    }

    if (extension === 'jpg' || extension === 'jpeg' || extension === 'png') {
        return extension
    }

    if ((mimeType || '').toLowerCase() === 'application/pdf') {
        return 'pdf'
    }

    if ((mimeType || '').toLowerCase().startsWith('image/')) {
        return 'jpg'
    }

    return 'doc'
}
const showToast = (type: 'success' | 'danger', message: string) => {
    toast.push(<Notification type={type}>{message}</Notification>, {
        placement: 'top-center',
    })
}

const SettingsCompany = () => {
    const { t } = useTranslation()

    const validationSchema: ZodType<CompanySchema> = z.object({
        name: z
            .string({ required_error: t('settingsCompany.validation.nameRequired') })
            .min(1, { message: t('settingsCompany.validation.nameRequired') }),
        legalName: z
            .string({ required_error: t('settingsCompany.validation.legalNameRequired') })
            .min(1, { message: t('settingsCompany.validation.legalNameRequired') }),
        phone: z
            .string({ required_error: t('settingsCompany.validation.phoneRequired') })
            .min(8, { message: t('settingsCompany.validation.phoneMin') })
            .max(30, { message: t('settingsCompany.validation.phoneTooLong') }),
        email: z
            .string({ required_error: t('settingsCompany.validation.emailRequired') })
            .min(1, { message: t('settingsCompany.validation.emailRequired') })
            .email({ message: t('settingsCompany.validation.emailInvalid') }),
        addressLine1: z
            .string({ required_error: t('settingsCompany.validation.addressRequired') })
            .min(1, { message: t('settingsCompany.validation.addressRequired') }),
        addressLine2: z.string(),
        city: z
            .string({ required_error: t('settingsCompany.validation.cityRequired') })
            .min(1, { message: t('settingsCompany.validation.cityRequired') }),
        postalCode: z
            .string({ required_error: t('settingsCompany.validation.postalCodeRequired') })
            .min(1, { message: t('settingsCompany.validation.postalCodeRequired') }),
        country: z
            .string({ required_error: t('settingsCompany.validation.countryRequired') })
            .min(1, { message: t('settingsCompany.validation.countryRequired') }),
        timezone: z.string(),
    })

    const statusMeta: Record<
        CompanyStatus,
        { label: string; dotClass: string; textClass: string }
    > = {
        in_creation: {
            label: t('settingsCompany.status.inCreation'),
            dotClass: 'bg-gray-400',
            textClass: 'text-gray-700 dark:text-gray-300',
        },
        pending: {
            label: t('settingsCompany.status.pending'),
            dotClass: 'bg-amber-500',
            textClass: 'text-amber-700 dark:text-amber-400',
        },
        rejected: {
            label: t('settingsCompany.status.rejected'),
            dotClass: 'bg-red-500',
            textClass: 'text-red-700 dark:text-red-400',
        },
        approved: {
            label: t('settingsCompany.status.approved'),
            dotClass: 'bg-emerald-500',
            textClass: 'text-emerald-700 dark:text-emerald-400',
        },
    }

    const [companyId, setCompanyId] = useState<number | null>(() => {
        const raw = localStorage.getItem(CURRENT_COMPANY_ID_KEY)
        return raw && /^\d+$/.test(raw) ? Number(raw) : null
    })

    const [company, setCompany] = useState<CurrentCompany | null>(null)
    const [loadingStatus, setLoadingStatus] = useState(true)
    const [logoError, setLogoError] = useState('')
    const [proofFilesError, setProofFilesError] = useState('')
    const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null)
    const [selectedProofFiles, setSelectedProofFiles] = useState<File[]>([])
    const [proofSelectionStarted, setProofSelectionStarted] = useState(false)
    const [logoPreview, setLogoPreview] = useState('')

    const {
        handleSubmit,
        formState: { errors, isSubmitting },
        control,
        reset,
    } = useForm<CompanySchema>({
        defaultValues,
        resolver: zodResolver(validationSchema),
    })

    const timezoneOptions = useMemo<TimezoneOption[]>(() => {
        return getSupportedTimezones().map((zone) => ({
            value: zone,
            label: zone,
        }))
    }, [])

    useEffect(() => {
        return () => {
            if (logoPreview) {
                URL.revokeObjectURL(logoPreview)
            }
        }
    }, [logoPreview])

    const refreshCompany = async () => {
        setLoadingStatus(true)
        setSelectedProofFiles([])
        setProofSelectionStarted(false)

        try {
            const resp = await apiMe()
            const currentCompany = resp.data?.current_company || null
            const isOwner =
                (resp.data?.current_member?.job_title || '').toLowerCase() ===
                'owner'

            if (isOwner) {
                localStorage.setItem(OWNER_COMPANY_TAB_KEY, '1')
            }

            if (currentCompany?.id) {
                localStorage.setItem(
                    CURRENT_COMPANY_ID_KEY,
                    String(currentCompany.id),
                )
                setCompanyId(currentCompany.id)
                setCompany(currentCompany)
                reset(mapCompanyToForm(currentCompany))
            } else {
                setCompanyId(null)
                setCompany(null)
                reset(defaultValues)
            }
        } catch {
            setCompany(null)
            reset(defaultValues)
        } finally {
            setLoadingStatus(false)
        }
    }

    useEffect(() => {
        refreshCompany()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const computedStatus: CompanyStatus = useMemo(() => {
        if (!company) {
            return 'in_creation'
        }

        if (company.approval_status === 'approved' && company.is_active) {
            return 'approved'
        }

        if (company.approval_status === 'rejected') {
            return 'rejected'
        }

        return 'pending'
    }, [company])

    const backendBaseUrl = (import.meta.env.VITE_BACKEND_URL || '').replace(
        /\/$/,
        '',
    )

    const currentLogoUrl = useMemo(() => {
        if (logoPreview) {
            return logoPreview
        }

        if (company?.logo_url) {
            if (/^https?:\/\//.test(company.logo_url)) {
                try {
                    const parsed = new URL(company.logo_url)
                    return `${backendBaseUrl}${parsed.pathname}`
                } catch {
                    return company.logo_url
                }
            }

            return `${backendBaseUrl}${company.logo_url}`
        }

        if (!company?.logo_path) {
            return ''
        }

        if (/^https?:\/\//.test(company.logo_path)) {
            return company.logo_path
        }

        if (company.logo_path.startsWith('/')) {
            return `${backendBaseUrl}${company.logo_path}`
        }

        return `${backendBaseUrl}/storage/${company.logo_path}`
    }, [backendBaseUrl, company?.logo_path, company?.logo_url, logoPreview])

    const beforeLogoUpload = (files: FileList | null) => {
        let valid: string | boolean = true

        const allowedFileType = ['image/jpeg', 'image/png', 'image/webp']

        if (files) {
            for (const file of files) {
                if (!allowedFileType.includes(file.type)) {
                    valid = t('settingsCompany.logo.errorType')
                }
            }
        }

        return valid
    }

    const beforeProofUpload = (files: FileList | null) => {
        let valid: string | boolean = true

        const allowedFileType = [
            'application/pdf',
            'image/jpeg',
            'image/png',
        ]

        if (files) {
            for (const file of files) {
                if (!allowedFileType.includes(file.type)) {
                    valid = t('settingsCompany.proof.errorType')
                }
            }
        }

        return valid
    }

    const removeSelectedProofFile = (fileIndex: number) => {
        setProofSelectionStarted(true)
        setSelectedProofFiles((prev) =>
            prev.filter((_, index) => index !== fileIndex),
        )
        setProofFilesError('')
    }

    const clearSelectedProofFiles = () => {
        setProofSelectionStarted(true)
        setSelectedProofFiles([])
        setProofFilesError('')
    }

    const onSubmit = async (values: CompanySchema) => {
        setLogoError('')
        setProofFilesError('')

        if (!company && !selectedLogoFile) {
            setLogoError(t('settingsCompany.logo.error'))
            return
        }

        if (!company && selectedProofFiles.length === 0) {
            setProofFilesError(t('settingsCompany.proof.error'))
            return
        }

        const selectedCountry = countryList.find(
            (country) => country.value === values.country,
        )

        const payload = {
            name: values.name.trim(),
            legalName: values.legalName.trim(),
            phone: values.phone.trim(),
            email: values.email.trim(),
            addressLine1: values.addressLine1.trim(),
            addressLine2: values.addressLine2.trim() || undefined,
            city: values.city.trim(),
            postalCode: values.postalCode.trim(),
            country: selectedCountry?.label || values.country,
            timezone: values.timezone.trim() || undefined,
        }

        try {
            const resp = company
                ? await apiUpdateCurrentCompany({
                      ...payload,
                      logo: selectedLogoFile || undefined,
                      proofFiles:
                          selectedProofFiles.length > 0
                              ? selectedProofFiles
                              : undefined,
                  })
                : await apiCreateCompany({
                      ...payload,
                      logo: selectedLogoFile as File,
                      proofFiles: selectedProofFiles,
                  })

            if (!resp.success || !resp.data?.company) {
                showToast('danger', resp.message || t('settingsCompany.toast.saveFailed'))
                return
            }

            const latestCompany = resp.data.company as CurrentCompany
            localStorage.setItem(CURRENT_COMPANY_ID_KEY, String(latestCompany.id))
            localStorage.setItem(OWNER_COMPANY_TAB_KEY, '1')
            setCompanyId(latestCompany.id)
            setCompany(latestCompany)
            reset(mapCompanyToForm(latestCompany))
            setSelectedLogoFile(null)
            setSelectedProofFiles([])
            setProofSelectionStarted(false)
            setProofFilesError('')

            showToast(
                'success',
                company
                    ? t('settingsCompany.toast.updated')
                    : t('settingsCompany.toast.created'),
            )
        } catch (error: unknown) {
            const responseMessage =
                (error as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message || t('settingsCompany.toast.saveFailed')

            showToast('danger', responseMessage)
        }
    }

    const displayedProofFiles = useMemo(
        () =>
            proofSelectionStarted
                ? selectedProofFiles.map((file, index) => ({
                      id: `selected-${file.name}-${file.size}-${index}`,
                      name: file.name,
                      mimeType: file.type,
                      sizeBytes: file.size,
                      type: getProofFileType(file.name, file.type),
                      isSelected: true,
                      selectedIndex: index,
                  }))
                : (company?.proof_files || []).map((file) => ({
                      id: `existing-${file.id}`,
                      name: file.original_name,
                      mimeType: file.mime_type,
                      sizeBytes: file.size_bytes,
                      type: getProofFileType(file.original_name, file.mime_type),
                      isSelected: false,
                      selectedIndex: -1,
                  })),
        [proofSelectionStarted, selectedProofFiles, company?.proof_files],
    )
    const meta = statusMeta[computedStatus]

    return (
        <div>
            <h4 className="mb-2">{t('settingsCompany.title')}</h4>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">
                {t('settingsCompany.description')}
            </p>

            <div className="mb-6 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${meta.dotClass}`} />
                    <span className={`text-sm font-semibold ${meta.textClass}`}>
                        {meta.label}
                    </span>
                </div>
                <Button size="sm" onClick={refreshCompany} loading={loadingStatus}>
                    {loadingStatus ? t('settingsCompany.status.refreshing') : t('settingsCompany.status.refresh')}
                </Button>
            </div>

            <Form onSubmit={handleSubmit(onSubmit)}>
                <div className="mb-8">
                    <label className="form-label mb-2">{t('settingsCompany.logo.label')}</label>
                    <div className="flex items-center gap-4">
                        <Avatar
                            size={90}
                            className="border-4 border-white bg-gray-100 text-gray-300 shadow-lg"
                            icon={<HiOutlineOfficeBuilding />}
                            src={currentLogoUrl || undefined}
                        />
                        <div className="flex items-center gap-2">
                            <Upload
                                showList={false}
                                uploadLimit={1}
                                beforeUpload={beforeLogoUpload}
                                onChange={(files) => {
                                    if (logoPreview) {
                                        URL.revokeObjectURL(logoPreview)
                                    }

                                    if (files.length > 0) {
                                        setSelectedLogoFile(files[0])
                                        setLogoPreview(URL.createObjectURL(files[0]))
                                        setLogoError('')
                                    }
                                }}
                            >
                                <Button
                                    variant="solid"
                                    size="sm"
                                    type="button"
                                    icon={<HiOutlineCloudUpload />}
                                >
                                    {t('settingsCompany.logo.upload')}
                                </Button>
                            </Upload>
                            {(selectedLogoFile || company?.logo_path) && (
                                <Button
                                    size="sm"
                                    type="button"
                                    onClick={() => {
                                        if (logoPreview) {
                                            URL.revokeObjectURL(logoPreview)
                                        }
                                        setSelectedLogoFile(null)
                                        setLogoPreview('')
                                        setLogoError('')
                                    }}
                                >
                                    {t('settingsCompany.logo.remove')}
                                </Button>
                            )}
                        </div>
                    </div>

                    {selectedLogoFile && (
                        <div className="mt-3 max-w-md rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-sm">
                            <p
                                className="truncate font-semibold"
                                title={selectedLogoFile.name}
                            >
                                {selectedLogoFile.name}
                            </p>
                            <p className="text-xs text-gray-500">
                                {Math.max(1, Math.round(selectedLogoFile.size / 1024))} kb
                            </p>
                        </div>
                    )}

                    {logoError && (
                        <p className="mt-2 text-red-500 text-sm">{logoError}</p>
                    )}
                </div>


                <div className="grid md:grid-cols-2 gap-4">
                    <FormItem
                        label={t('settingsCompany.field.companyName')}
                        invalid={Boolean(errors.name)}
                        errorMessage={errors.name?.message}
                    >
                        <Controller
                            name="name"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="text"
                                    autoComplete="off"
                                    placeholder={t('settingsCompany.field.companyName')}
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>

                    <FormItem
                        label={t('settingsCompany.field.legalName')}
                        invalid={Boolean(errors.legalName)}
                        errorMessage={errors.legalName?.message}
                    >
                        <Controller
                            name="legalName"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="text"
                                    autoComplete="off"
                                    placeholder={t('settingsCompany.field.legalName')}
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <FormItem
                        label={t('settingsCompany.field.phone')}
                        invalid={Boolean(errors.phone)}
                        errorMessage={errors.phone?.message}
                    >
                        <Controller
                            name="phone"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="text"
                                    autoComplete="off"
                                    placeholder={t('settingsCompany.field.phone')}
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>

                    <FormItem
                        label={t('settingsCompany.field.email')}
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
                                    placeholder="company@example.com"
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                </div>

                <FormItem
                    label={t('settingsCompany.field.addressLine1')}
                    invalid={Boolean(errors.addressLine1)}
                    errorMessage={errors.addressLine1?.message}
                >
                    <Controller
                        name="addressLine1"
                        control={control}
                        render={({ field }) => (
                            <Input
                                type="text"
                                autoComplete="off"
                                placeholder={t('settingsCompany.field.addressLine1')}
                                {...field}
                            />
                        )}
                    />
                </FormItem>

                <FormItem
                    label={t('settingsCompany.field.addressLine2')}
                    invalid={Boolean(errors.addressLine2)}
                    errorMessage={errors.addressLine2?.message}
                >
                    <Controller
                        name="addressLine2"
                        control={control}
                        render={({ field }) => (
                            <Input
                                type="text"
                                autoComplete="off"
                                placeholder={t('settingsCompany.field.addressLine2Placeholder')}
                                {...field}
                            />
                        )}
                    />
                </FormItem>

                <div className="grid md:grid-cols-2 gap-4">
                    <FormItem
                        label={t('settingsCompany.field.city')}
                        invalid={Boolean(errors.city)}
                        errorMessage={errors.city?.message}
                    >
                        <Controller
                            name="city"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="text"
                                    autoComplete="off"
                                    placeholder={t('settingsCompany.field.city')}
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>

                    <FormItem
                        label={t('settingsCompany.field.postalCode')}
                        invalid={Boolean(errors.postalCode)}
                        errorMessage={errors.postalCode?.message}
                    >
                        <Controller
                            name="postalCode"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="text"
                                    autoComplete="off"
                                    placeholder={t('settingsCompany.field.postalCode')}
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <FormItem
                        label={t('settingsCompany.field.country')}
                        invalid={Boolean(errors.country)}
                        errorMessage={errors.country?.message}
                    >
                        <Controller
                            name="country"
                            control={control}
                            render={({ field }) => (
                                <Select<CountryOption>
                                    options={countryList}
                                    components={{
                                        Option: (props) => (
                                            <CountryOptionItem
                                                {...(props as OptionProps<CountryOption>)}
                                            />
                                        ),
                                        Control: CountryControl,
                                    }}
                                    placeholder={t('settingsCompany.field.selectCountry')}
                                    value={countryList.find(
                                        (option) => option.value === field.value,
                                    )}
                                    onChange={(option) =>
                                        field.onChange(option?.value || '')
                                    }
                                />
                            )}
                        />
                    </FormItem>

                    <FormItem
                        label={t('settingsCompany.field.timezone')}
                        invalid={Boolean(errors.timezone)}
                        errorMessage={errors.timezone?.message}
                    >
                        <Controller
                            name="timezone"
                            control={control}
                            render={({ field }) => (
                                <Select<TimezoneOption>
                                    options={timezoneOptions}
                                    placeholder={t('settingsCompany.field.selectTimezone')}
                                    value={timezoneOptions.find(
                                        (option) => option.value === field.value,
                                    )}
                                    isClearable
                                    onChange={(option) =>
                                        field.onChange(option?.value || '')
                                    }
                                />
                            )}
                        />
                    </FormItem>
                </div>

                <div className="mb-8">
                    <label className="form-label mb-2">
                        {t('settingsCompany.proof.label')}
                    </label>

                    <Upload
                        showList={false}
                        fileList={selectedProofFiles}
                        multiple
                        draggable
                        beforeUpload={beforeProofUpload}
                        onChange={(files) => {
                            setProofSelectionStarted(true)
                            setSelectedProofFiles(files)
                            setProofFilesError('')
                        }}
                    >
                        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 py-8 px-4 text-center">
                            <div className="text-4xl mb-2 flex justify-center">
                                <FcImageFile />
                            </div>
                            <p className="font-semibold">
                                <span className="text-gray-800 dark:text-white">
                                    {t('settingsCompany.proof.drop')}{' '}
                                </span>
                                <span className="text-blue-500">{t('settingsCompany.proof.browse')}</span>
                            </p>
                            <p className="mt-1 opacity-60 dark:text-white">
                                {t('settingsCompany.proof.support')}
                            </p>
                            {company && (
                                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                                    {t('settingsCompany.proof.replaceWarning')}
                                </p>
                            )}
                        </div>
                    </Upload>

                    {displayedProofFiles.length > 0 && (
                        <div className="mt-3 space-y-2 max-w-xl">
                            {selectedProofFiles.length > 0 && (
                                <div className="flex justify-end">
                                    <Button
                                        type="button"
                                        size="xs"
                                        onClick={clearSelectedProofFiles}
                                    >
                                        {t('settingsCompany.proof.clearSelection')}
                                    </Button>
                                </div>
                            )}
                            {displayedProofFiles.map((file) => (
                                <div
                                    key={file.id}
                                    className="rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-sm"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="text-3xl shrink-0">
                                            <FileIcon type={file.type} size={34} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-semibold" title={file.name}>
                                                {file.name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {fileSizeUnit(file.sizeBytes || 0)}
                                            </p>
                                        </div>
                                        <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                                            {file.type}
                                        </div>
                                        {file.isSelected && (
                                            <button
                                                type="button"
                                                className="shrink-0 rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                                                aria-label={`Remove ${file.name}`}
                                                onClick={() =>
                                                    removeSelectedProofFile(
                                                        file.selectedIndex,
                                                    )
                                                }
                                            >
                                                <HiOutlineX className="text-base" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {proofFilesError && (
                        <p className="mt-2 text-red-500 text-sm">{proofFilesError}</p>
                    )}
                </div>

                <div className="flex justify-end">
                    <Button variant="solid" type="submit" loading={isSubmitting}>
                        {companyId ? t('settingsCompany.button.update') : t('settingsCompany.button.create')}
                    </Button>
                </div>
            </Form>
        </div>
    )
}

export default SettingsCompany




