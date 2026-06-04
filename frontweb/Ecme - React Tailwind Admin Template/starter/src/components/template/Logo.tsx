import classNames from 'classnames'
import type { CommonProps } from '@/@types/common'

interface LogoProps extends CommonProps {
    type?: 'full' | 'streamline'
    mode?: 'light' | 'dark'
    imgClass?: string
    logoWidth?: number | string
}

const Logo = (props: LogoProps) => {
    const {
        type = 'full',
        className,
        style,
        logoWidth = 'auto',
    } = props

    return (
        <div
            className={classNames('logo flex items-center', className)}
            style={{ ...style, width: logoWidth }}
        >
            {type === 'streamline' ? (
                <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-black leading-none">C</span>
                </div>
            ) : (
                <span
                    className="text-gray-900 font-black tracking-widest select-none"
                    style={{ fontSize: 20, letterSpacing: 5 }}
                >
                    CMMS
                </span>
            )}
        </div>
    )
}

export default Logo
