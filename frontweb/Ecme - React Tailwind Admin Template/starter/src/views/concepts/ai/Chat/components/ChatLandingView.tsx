import useChatSend from '../hooks/useChatSend'
import {
    PiLightbulbDuotone,
    PiWrenchDuotone,
    PiWarningDuotone,
    PiHeartbeatDuotone,
    PiClipboardTextDuotone,
    PiUsersDuotone,
} from 'react-icons/pi'
import type { ReactNode } from 'react'

type PromptCard = { title: string; prompt: string; icon: ReactNode; color: string }

const suggestions: PromptCard[] = [
    {
        title: 'Show my open work orders',
        prompt: 'Show me all open work orders',
        icon: <PiWrenchDuotone />,
        color: 'text-blue-500',
    },
    {
        title: 'Detect anomalies & problems',
        prompt: 'Detect anomalies in the system — overdue work orders, repeated failures, overloaded technicians',
        icon: <PiWarningDuotone />,
        color: 'text-red-500',
    },
    {
        title: 'Analyze asset health',
        prompt: 'Analyze the health of all my assets based on their maintenance history',
        icon: <PiHeartbeatDuotone />,
        color: 'text-emerald-500',
    },
    {
        title: 'List all PM plans',
        prompt: 'Show me all preventive maintenance plans',
        icon: <PiClipboardTextDuotone />,
        color: 'text-indigo-500',
    },
    {
        title: 'Check technician availability',
        prompt: 'Show me all technicians and their current workload',
        icon: <PiUsersDuotone />,
        color: 'text-amber-500',
    },
    {
        title: 'Create a work order',
        prompt: 'I need to create a work order for a pump inspection, high priority, due next Monday',
        icon: <PiLightbulbDuotone />,
        color: 'text-purple-500',
    },
]

const ChatLandingView = () => {
    const { handleSend } = useChatSend()

    return (
        <div className="max-w-[900px] w-full mx-auto mt-16">
            <div className="heading-text text-4xl leading-snug">
                <span className="font-semibold bg-linear-to-r from-indigo-500 to-red-400 bg-clip-text text-transparent text-5xl">
                    CMMS Copilot
                </span>
                <br />
                <span>What would you like to do today?</span>
            </div>
            <div className="mt-8 grid grid-cols-2 xl:grid-cols-3 gap-4">
                {suggestions.map((s) => (
                    <div
                        key={s.title}
                        className="flex flex-col gap-4 justify-between rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 p-5 min-h-36 cursor-pointer transition-colors"
                        role="button"
                        onClick={() => handleSend(s.prompt)}
                    >
                        <h6 className="font-normal">{s.title}</h6>
                        <div>
                            <div className="bg-white dark:bg-gray-800 rounded-full p-2 inline-flex">
                                <span className={`text-2xl ${s.color}`}>{s.icon}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default ChatLandingView
