import { PreferenceSelector } from './PreferenceComponents'
import { PRIORITY_CATEGORIES, priorityCategory, selectPriorityCategory } from '../utils/priorityCategories'

export default function PrioritySettings({ values, onChange }) {
  return <section className="my-8 space-y-5" aria-label="Route priorities">
    <p className="text-sm">These priorities guide route trade-offs. They do not change your walking speed or ability.</p>
    {[["minimizeWalkingPriority", "Priority for less walking"], ["shelterPriority", "Priority for shelter"]].map(([key, label]) =>
      <PreferenceSelector key={key} title={label}
        description={key === 'minimizeWalkingPriority' ? 'How important is reducing walking on your journey?' : 'How important is sheltered walking on your journey?'}
        options={PRIORITY_CATEGORIES} value={priorityCategory(values[key])}
        onChange={category => onChange({ ...values, [key]: selectPriorityCategory(values[key], category) })} />)}
    <label className="flex gap-3 items-start">
      <input type="checkbox" checked={values.automaticLearning} onChange={event => onChange({ ...values, automaticLearning: event.target.checked })} />
      <span>Learn from my confirmed route choices
        <span className="block text-sm">AI reviews your confirmed alternatives and may gradually adjust your priorities. You can edit them or switch learning off at any time.</span>
      </span>
    </label>
  </section>
}
