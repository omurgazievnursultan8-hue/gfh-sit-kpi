import { useState, useId } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { AppDispatch } from '../../../app/store'
import { setAuthState } from '../slice'
import api from '../../../app/api'
import axios from 'axios'

export function PdpaConsentPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const { t, i18n } = useTranslation()
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const titleId = useId()
  const bodyId = useId()
  const checkboxId = useId()

  const isKg = i18n.language.startsWith('kg')

  const handleAccept = async () => {
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/pdpa/accept?version=1.0')
      dispatch(setAuthState({ pdpaRequired: false }))
      navigate('/dashboard')
    } catch (err) {
      const data = axios.isAxiosError(err)
        ? (err.response?.data as { messageRu?: string; message_ru?: string })
        : undefined
      setError(data?.messageRu ?? data?.message_ru ?? (t('auth.pdpaSaveFailed', 'Ошибка при сохранении согласия') as string))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-lg shadow-md p-8 max-w-lg w-full"
        role="region"
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className="text-xl font-bold text-gray-900 mb-4">
          {t('auth.pdpaTitle', 'Согласие на обработку персональных данных')}
        </h2>
        <div
          id={bodyId}
          className="bg-gray-50 rounded-md p-4 mb-6 max-h-64 overflow-y-auto text-sm text-gray-700 leading-relaxed"
          tabIndex={0}
          role="region"
          aria-label={t('auth.pdpaBodyLabel', 'Текст согласия') as string}
        >
          {isKg ? (
            <>
              <p className="mb-3">
                Кыргыз Республикасынын «Жеке маалыматтар жөнүндө» Мыйзамына ылайык, «Мамлекеттик каржы холдинги» ААК кызматкерлердин иштин натыйжалуулугун баалоо максатында сиздин жеке маалыматтарыңызды иштетет.
              </p>
              <p className="mb-3">
                Иштетилүүчү маалыматтар: ФАА, кызмат орду, бөлүм, баалоо натыйжалары, баалоо тарыхы, системага кирүү даталары.
              </p>
              <p>
                Маалыматтар МКХ серверлеринде сакталат жана үчүнчү жактарга берилбейт. Сиз «Профиль» бөлүмү аркылуу маалыматтарыңызга жетүү жана аларды жүктөп алуу укугуна ээсиз.
              </p>
            </>
          ) : (
            <>
              <p className="mb-3">
                В соответствии с Законом Кыргызской Республики «О персональных данных», ОАО «Государственный финансовый холдинг» обрабатывает ваши персональные данные в целях оценки эффективности работы сотрудников.
              </p>
              <p className="mb-3">
                Обрабатываемые данные: ФИО, должность, подразделение, результаты оценки эффективности, история оценок, даты входа в систему.
              </p>
              <p>
                Данные хранятся на серверах ГФХ и не передаются третьим лицам. Вы имеете право на доступ к своим данным и их выгрузку через раздел «Профиль».
              </p>
            </>
          )}
        </div>
        <label htmlFor={checkboxId} className="flex items-start gap-3 cursor-pointer mb-6">
          <input
            id={checkboxId}
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            aria-describedby={bodyId}
            className="mt-0.5 h-4 w-4 rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">
            {t('auth.pdpaAcknowledge', 'Я ознакомился(-лась) с политикой обработки персональных данных и даю своё согласие на обработку данных в указанных целях.')}
          </span>
        </label>
        {error && (
          <p className="text-sm text-red-600 mb-4" role="alert" aria-live="assertive">{error}</p>
        )}
        <button
          type="button"
          onClick={handleAccept}
          disabled={!agreed || loading}
          className="w-full py-2 bg-primary text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? t('common.saving', 'Сохранение...') : t('auth.pdpaAccept', 'Принять и продолжить')}
        </button>
      </div>
    </div>
  )
}
