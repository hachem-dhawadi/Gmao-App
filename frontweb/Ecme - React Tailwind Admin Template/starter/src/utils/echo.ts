import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import AxiosBase from '@/services/axios/AxiosBase'

declare global {
    interface Window {
        Pusher: typeof Pusher
    }
}

window.Pusher = Pusher

// Show WebSocket activity in the browser console during development
if (import.meta.env.DEV) {
    Pusher.logToConsole = true
}

const echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: Number(import.meta.env.VITE_REVERB_PORT),
    wssPort: Number(import.meta.env.VITE_REVERB_PORT),
    forceTLS: import.meta.env.VITE_REVERB_SCHEME === 'https',
    enabledTransports: ['ws', 'wss'],
    authorizer: (channel: { name: string }) => ({
        authorize: (
            socketId: string,
            callback: (error: Error | null, data: { auth: string } | null) => void,
        ) => {
            AxiosBase.post(
                `${window.location.origin}/api/broadcasting/auth`,
                { socket_id: socketId, channel_name: channel.name },
            )
                .then((res) => callback(null, res.data))
                .catch((err) => {
                    console.error('[Echo] Channel auth failed:', err)
                    callback(err, null)
                })
        },
    }),
})

export default echo
