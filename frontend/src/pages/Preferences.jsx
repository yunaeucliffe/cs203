import { useState } from 'react'
import { API_URL, getCsrfToken } from '../api'
import { PreferenceSelector } from '../components/PreferenceComponents'

function Preferences({ onComplete }) {
    const [formValues, setFormValues] = useState({
        walkingSpeed: 'Normal',
        walkingTolerance: 'Moderate',
        preferSheltered: false,
    })

    const [error, setError] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    const handleComplete = async () => {
        setError('')
        setIsSaving(true)

        try {
            const csrfToken = await getCsrfToken()

            const response = await fetch(
                `${API_URL}/api/users/me/preferences`,
                {
                    method: 'PUT',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-XSRF-TOKEN': csrfToken,
                    },
                    body: JSON.stringify(formValues),
                },
            )

            const data = await response.json().catch(() => null)

            if (!response.ok) {
                throw new Error(data?.message || 'Unable to save preferences.')
            }

            onComplete()
        } catch (requestError) {
            setError(requestError.message)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#FAF7F0] text-[#2A3439]">
            <main className="mx-auto max-w-3xl px-8 py-16">

                <div className="mb-10 text-center">
                    <h1 className="text-4xl font-semibold">
                        Set your preferences
                    </h1>

                    <p className="mt-3 text-[#7A7F7A]">
                        Help us find routes that suit you better.
                    </p>
                </div>

                <div className="rounded-[24px] border border-[#7A7F7A]/15 bg-white/60 p-8">

                    <PreferenceSelector
                        title="Walking speed"
                        description="How would you describe your usual walking speed?"
                        options={['Slow', 'Normal', 'Fast']}
                        value={formValues.walkingSpeed}
                        onChange={(value) =>
                            setFormValues({
                                ...formValues,
                                walkingSpeed: value,
                            })
                        }
                    />

                    <div className="my-8 border-t border-[#7A7F7A]/15" />

                    <PreferenceSelector
                        title="Walking tolerance"
                        description="How would you describe your walking tolerance?"
                        options={['Poor', 'Moderate', 'Good']}
                        value={formValues.walkingTolerance}
                        onChange={(value) =>
                            setFormValues({
                                ...formValues,
                                walkingTolerance: value,
                            })
                        }
                    />

                    <div className="my-8 border-t border-[#7A7F7A]/15" />

                    <PreferenceSelector
                        title="Sheltered paths"
                        description="Would you prefer sheltered paths where possible?"
                        options={['Yes', 'No']}
                        value={formValues.preferSheltered ? 'Yes' : 'No'}
                        onChange={(value) =>
                            setFormValues({
                                ...formValues,
                                preferSheltered: value === 'Yes',
                            })
                        }
                    />

                    {error && (
                        <p role="alert" className="mt-6 text-center text-red-700">
                            {error}
                        </p>
                    )}

                    <button
                        type="button"
                        onClick={handleComplete}
                        disabled={isSaving}
                        className="mt-10 h-[60px] w-full rounded-full bg-[#3E424B] text-lg font-semibold text-white transition hover:bg-[#2A3439] disabled:opacity-60"
                    >
                        {isSaving ? 'Saving...' : 'Complete setup'}
                    </button>

                </div>
            </main>
        </div>
    )
}

export default Preferences