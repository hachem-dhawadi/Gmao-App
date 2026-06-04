// Exact colors from the web app (tailwind/index.css CSS variables)
export const Colors = {
    primary:       '#2a85ff',
    primaryDeep:   '#0069f6',
    primaryMild:   '#4996ff',
    primarySubtle: '#2a85ff1a',

    error:         '#ff6a55',
    errorSubtle:   '#ff6a551a',
    success:       '#10b981',
    successSubtle: '#05eb7624',
    warning:       '#f59e0b',
    warningSubtle: '#ffd40045',
    info:          '#2a85ff',
    infoSubtle:    '#2a85ff1a',

    gray50:  '#fafafa',
    gray100: '#f5f5f5',
    gray200: '#e5e5e5',
    gray300: '#d4d4d4',
    gray400: '#a3a3a3',
    gray500: '#737373',
    gray600: '#525252',
    gray700: '#404040',
    gray800: '#262626',
    gray900: '#171717',
    gray950: '#0a0a0a',

    white: '#ffffff',
    black: '#000000',
}

// Status colors — same as web badges
export const StatusColors: Record<string, { bg: string; text: string; border: string }> = {
    open:        { bg: '#2a85ff1a', text: '#2a85ff', border: '#2a85ff33' },
    in_progress: { bg: '#ffd40045', text: '#f59e0b', border: '#f59e0b33' },
    on_hold:     { bg: '#ff6a551a', text: '#ff6a55', border: '#ff6a5533' },
    completed:   { bg: '#05eb7624', text: '#10b981', border: '#10b98133' },
    cancelled:   { bg: '#f5f5f5',   text: '#737373', border: '#e5e5e5'   },
}

export const PriorityColors: Record<string, { bg: string; text: string }> = {
    low:      { bg: '#05eb7624', text: '#10b981' },
    medium:   { bg: '#ffd40045', text: '#f59e0b' },
    high:     { bg: '#ff6a551a', text: '#ff6a55' },
    critical: { bg: '#ff6a5530', text: '#cc2200' },
}
