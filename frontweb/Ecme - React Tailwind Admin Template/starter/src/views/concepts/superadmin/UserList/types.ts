type PersonalInfo = {
    location: string
    title: string
    birthday: string
    phoneNumber: string
    dialCode: string
    address: string
    postcode: string
    city: string
    country: string
    facebook: string
    twitter: string
    pinterest: string
    linkedIn: string
}

export type Filter = {
    userName: string
    userRole: Array<'superadmin' | 'user'>
    userStatus: Array<'active' | 'inactive'>
}

export type AppUser = {
    id: string
    name: string
    firstName: string
    lastName: string
    email: string
    img: string
    role: string
    isSuperadmin: boolean
    lastOnline: number
    status: string
    membersCount: number
    personalInfo: PersonalInfo
    orderHistory: []
    paymentMethod: []
    subscription: []
    totalSpending: number
}

// Alias so DataTable generics work with the same Customer shape
export type Customer = AppUser
