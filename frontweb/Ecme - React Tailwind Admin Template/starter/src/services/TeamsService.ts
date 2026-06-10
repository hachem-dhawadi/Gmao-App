import ApiService from './ApiService'

export type TeamMember = {
    id: number
    name: string
    avatar: string | null
    job_title: string | null
}

export type Team = {
    id: number
    name: string
    description: string | null
    color: string
    is_active: boolean
    members_count: number | null
    members: TeamMember[] | null
    created_at: string | null
}

export type TeamSlim = {
    id: number
    name: string
    color: string
    member_ids: number[]
}

export type TeamsListResponse = {
    success: boolean
    data: {
        teams: Team[]
        pagination: {
            total: number
            per_page: number
            current_page: number
            last_page: number
        }
    }
}

export type TeamResponse = {
    success: boolean
    data: { team: Team }
}

export type TeamsAllResponse = {
    success: boolean
    data: { teams: TeamSlim[] }
}

export type TeamListParams = {
    page?: number
    per_page?: number
    search?: string
    is_active?: boolean
}

export type TeamPayload = {
    name: string
    description?: string | null
    color?: string
    is_active?: boolean
    member_ids?: number[]
}

export async function apiGetTeamsList(params?: TeamListParams) {
    return ApiService.fetchDataWithAxios<TeamsListResponse>({
        url: '/teams',
        method: 'get',
        params,
    })
}

export async function apiGetAllTeams() {
    return ApiService.fetchDataWithAxios<TeamsAllResponse>({
        url: '/teams/all',
        method: 'get',
    })
}

export async function apiGetTeam(id: number) {
    return ApiService.fetchDataWithAxios<TeamResponse>({
        url: `/teams/${id}`,
        method: 'get',
    })
}

export async function apiCreateTeam(data: TeamPayload) {
    return ApiService.fetchDataWithAxios<TeamResponse>({
        url: '/teams',
        method: 'post',
        data,
    })
}

export async function apiUpdateTeam(id: number, data: Partial<TeamPayload>) {
    return ApiService.fetchDataWithAxios<TeamResponse>({
        url: `/teams/${id}`,
        method: 'patch',
        data,
    })
}

export async function apiDeleteTeam(id: number) {
    return ApiService.fetchDataWithAxios<{ success: boolean; message: string }>({
        url: `/teams/${id}`,
        method: 'delete',
    })
}
