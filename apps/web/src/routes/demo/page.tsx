import { useTranslation } from 'react-i18next'

export default function DemoPage() {
  const { t } = useTranslation()
  return (
    <div className="p-4">
      <h1>{t('message.route_title_demo')}</h1>
    </div>
  )
}
