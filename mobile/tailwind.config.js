/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './app/**/*.{js,ts,jsx,tsx}',
        './components/**/*.{js,ts,jsx,tsx}',
        './screens/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                primary:       '#2a85ff',
                'primary-deep':   '#0069f6',
                'primary-mild':   '#4996ff',
                'primary-subtle': 'rgba(42,133,255,0.1)',
                error:         '#ff6a55',
                success:       '#10b981',
                warning:       '#f59e0b',
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
            },
        },
    },
    plugins: [],
}
