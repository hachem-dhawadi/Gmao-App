import classNames from 'classnames'
import { APP_NAME } from '@/constants/app.constant'
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
        imgClass,
        style,
        logoWidth = 'auto',
    } = props

    const src =
        type === 'streamline'
            ? '/img/logo/logo-icon.png'
            : '/img/logo/logo-full.png'

    return (
        <div
            className={classNames('logo', className)}
            style={{ ...style, width: logoWidth }}
        >
            <img
                className={imgClass}
                src={src}
                alt={`${APP_NAME} logo`}
            />
        </div>
    )
}

export default Logo
