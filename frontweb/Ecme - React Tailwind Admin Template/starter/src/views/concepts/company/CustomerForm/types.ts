import type { Control, FieldErrors } from 'react-hook-form'

export type OverviewFields = {
    firstName: string
    lastName: string
    email: string
    dialCode: string
    phoneNumber: string
    img: string
}

export type AddressFields = {
    country: string
    address: string
    postcode: string
    city: string
}

export type ProfileImageFields = {
    img: string
    logoFile?: File | null
}

export type TagsFields = {
    tags: Array<{ value: string; label: string }>
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export type StatusField = {
    isActive?: boolean
    approvalStatus?: ApprovalStatus
}

export type CustomerFormSchema = OverviewFields &
    AddressFields &
    ProfileImageFields &
    TagsFields &
    StatusField

export type FormSectionBaseProps = {
    control: Control<CustomerFormSchema>
    errors: FieldErrors<CustomerFormSchema>
}
