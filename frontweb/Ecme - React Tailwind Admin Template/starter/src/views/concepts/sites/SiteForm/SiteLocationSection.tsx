import { useState } from 'react'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { FormItem } from '@/components/ui/Form'
import { Controller } from 'react-hook-form'
import { TbCurrentLocation, TbMapPin } from 'react-icons/tb'
import type { Control, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form'
import type { SiteFormSchema } from './types'

type Props = {
    control: Control<SiteFormSchema>
    errors: FieldErrors<SiteFormSchema>
    setValue: UseFormSetValue<SiteFormSchema>
    watch: UseFormWatch<SiteFormSchema>
}

type TzOption = { value: string; label: string }

const TIMEZONE_OPTIONS: TzOption[] = [
    { value: 'UTC', label: 'UTC' },
    { value: 'Africa/Tunis', label: 'Africa/Tunis (UTC+1)' },
    { value: 'Africa/Cairo', label: 'Africa/Cairo (UTC+2)' },
    { value: 'Africa/Algiers', label: 'Africa/Algiers (UTC+1)' },
    { value: 'Africa/Casablanca', label: 'Africa/Casablanca (UTC+1)' },
    { value: 'Europe/Paris', label: 'Europe/Paris (UTC+1/+2)' },
    { value: 'Europe/London', label: 'Europe/London (UTC+0/+1)' },
    { value: 'Europe/Berlin', label: 'Europe/Berlin (UTC+1/+2)' },
    { value: 'Europe/Madrid', label: 'Europe/Madrid (UTC+1/+2)' },
    { value: 'Asia/Dubai', label: 'Asia/Dubai (UTC+4)' },
    { value: 'Asia/Riyadh', label: 'Asia/Riyadh (UTC+3)' },
    { value: 'Asia/Beirut', label: 'Asia/Beirut (UTC+2/+3)' },
    { value: 'Asia/Baghdad', label: 'Asia/Baghdad (UTC+3)' },
    { value: 'Asia/Karachi', label: 'Asia/Karachi (UTC+5)' },
    { value: 'Asia/Kolkata', label: 'Asia/Kolkata (UTC+5:30)' },
    { value: 'Asia/Shanghai', label: 'Asia/Shanghai (UTC+8)' },
    { value: 'Asia/Tokyo', label: 'Asia/Tokyo (UTC+9)' },
    { value: 'America/New_York', label: 'America/New_York (UTC-5/-4)' },
    { value: 'America/Chicago', label: 'America/Chicago (UTC-6/-5)' },
    { value: 'America/Los_Angeles', label: 'America/Los_Angeles (UTC-8/-7)' },
    { value: 'Australia/Sydney', label: 'Australia/Sydney (UTC+10/+11)' },
]

const SiteLocationSection = ({ control, errors, setValue, watch }: Props) => {
    const [gettingGPS, setGettingGPS] = useState(false)
    const [gpsError, setGpsError] = useState('')

    const geoLat = watch('geo_lat')
    const geoLng = watch('geo_lng')
    const hasCoords = geoLat && geoLng

    const handleGetGPS = () => {
        if (!navigator.geolocation) {
            setGpsError('Geolocation is not supported by your browser.')
            return
        }
        setGettingGPS(true)
        setGpsError('')
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setValue('geo_lat', String(pos.coords.latitude.toFixed(6)), {
                    shouldValidate: true,
                })
                setValue('geo_lng', String(pos.coords.longitude.toFixed(6)), {
                    shouldValidate: true,
                })
                setGettingGPS(false)
            },
            () => {
                setGpsError(
                    'Unable to retrieve location. Check browser permissions.',
                )
                setGettingGPS(false)
            },
        )
    }

    const handleClearCoords = () => {
        setValue('geo_lat', '')
        setValue('geo_lng', '')
        setGpsError('')
    }

    return (
        <Card>
            <h4 className="mb-2">Location</h4>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
                Physical address, timezone and optional GPS coordinates.
            </p>

            <FormItem
                label="Address"
                invalid={Boolean(errors.address)}
                errorMessage={errors.address?.message}
            >
                <Controller
                    name="address"
                    control={control}
                    render={({ field }) => (
                        <Input
                            textArea
                            rows={3}
                            placeholder="e.g. Zone Industrielle, Charguia II, Tunis"
                            {...field}
                        />
                    )}
                />
            </FormItem>

            <FormItem
                label="Timezone"
                invalid={Boolean(errors.timezone)}
                errorMessage={errors.timezone?.message}
            >
                <Controller
                    name="timezone"
                    control={control}
                    render={({ field }) => (
                        <Select<TzOption>
                            options={TIMEZONE_OPTIONS}
                            value={
                                TIMEZONE_OPTIONS.find(
                                    (o) => o.value === field.value,
                                ) ?? null
                            }
                            onChange={(option) =>
                                field.onChange(option?.value ?? 'UTC')
                            }
                            placeholder="Select timezone"
                        />
                    )}
                />
            </FormItem>

            {/* GPS Coordinates */}
            <div className="mt-2">
                <span className="font-semibold text-sm">GPS Coordinates</span>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 mb-3">
                    Click the button to capture your current location automatically.
                </p>

                {hasCoords ? (
                    <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-3 mb-3">
                        <div className="flex items-center gap-2 text-sm">
                            <TbMapPin className="text-primary text-base shrink-0" />
                            <span className="font-mono text-gray-700 dark:text-gray-200">
                                {parseFloat(geoLat!).toFixed(5)},{' '}
                                {parseFloat(geoLng!).toFixed(5)}
                            </span>
                        </div>
                        <button
                            type="button"
                            className="text-xs text-red-400 hover:text-red-600"
                            onClick={handleClearCoords}
                        >
                            Clear
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-3 mb-3">
                        <TbMapPin className="text-gray-400 text-base shrink-0" />
                        <span className="text-sm text-gray-400 dark:text-gray-500">
                            No coordinates set
                        </span>
                    </div>
                )}

                {gpsError && (
                    <p className="text-xs text-red-500 mb-2">{gpsError}</p>
                )}

                <Button
                    type="button"
                    variant="default"
                    size="sm"
                    icon={<TbCurrentLocation />}
                    loading={gettingGPS}
                    onClick={handleGetGPS}
                    className="w-full"
                >
                    {gettingGPS ? 'Getting location…' : 'Use Current GPS Location'}
                </Button>
            </div>
        </Card>
    )
}

export default SiteLocationSection
