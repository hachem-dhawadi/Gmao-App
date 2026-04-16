import type { Control, FieldErrors, UseFormSetValue } from 'react-hook-form'

export type OverviewFields = {
    firstName: string
    lastName: string
    email: string
    dialCode: string
    phoneNumber: string
    img: string
    employeeCode?: string
    locale?: string
    password?: string
    passwordConfirmation?: string
}

export type AddressFields = {
    country?: string
    address?: string
    postcode?: string
    city?: string
}

export type ProfileImageFields = {
    img: string
    imgFile?: File | null
    removeAvatar?: boolean
}

export type RoleField = {
    role: 'admin' | 'hr' | 'manager' | 'technician' | ''
}

export type AccountField = {
    banAccount?: boolean
    accountVerified?: boolean
}

export type CustomerFormSchema = OverviewFields &
    AddressFields &
    ProfileImageFields &
    RoleField &
    AccountField

export type FormSectionBaseProps = {
    control: Control<CustomerFormSchema>
    errors: FieldErrors<CustomerFormSchema>
    setValue: UseFormSetValue<CustomerFormSchema>
}
