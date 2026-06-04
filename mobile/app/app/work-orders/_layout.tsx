import { Stack } from 'expo-router'
import { Colors } from '@/constants/colors'

export default function WorkOrdersLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown:  false,
                contentStyle: { backgroundColor: Colors.gray100 },
                animation:    'slide_from_right',
            }}
        />
    )
}
