import { useState } from 'react';
import { Settings, Radio, Camera, FileText, Users, Server, Activity } from 'lucide-react';
import { AdminSettings } from './components/AdminSettings';
import { AudioControl } from './components/AudioControl';

export default function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [audioStatus, setAudioStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Camera className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Пульт наблюдения «Допросная»
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  СКИТ · Система контроля и интеграции технологий
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Индикатор статуса аудио */}
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  audioStatus === 'connected' ? 'bg-green-500' :
                  audioStatus === 'error' ? 'bg-red-500' :
                  'bg-gray-400'
                }`} />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {audioStatus === 'connected' ? 'Аудио подключено' :
                   audioStatus === 'error' ? 'Ошибка аудио' :
                   'Аудио отключено'}
                </span>
              </div>

              {/* Кнопка настроек */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5" />
                Настройки
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Быстрый доступ к аудио */}
          <div className="lg:col-span-2">
            <AudioControl onStatusChange={setAudioStatus} />
          </div>

          {/* Информационные карточки */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Camera className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold">Видеонаблюдение</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Интеграция с MACROSCOP VMS для управления видеопотоками с камер наблюдения.
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Статус:</span>
                <span className="font-medium text-green-600">Активно</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Камеры:</span>
                <span className="font-medium">3 подключены</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">MediaMTX:</span>
                <span className="font-medium text-green-600">Работает</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-semibold">Документы</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Совместное редактирование протоколов через ONLYOFFICE Docs.
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Статус:</span>
                <span className="font-medium text-green-600">Подключено</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Документы:</span>
                <span className="font-medium">12 активных</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Пользователи:</span>
                <span className="font-medium">8 онлайн</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-semibold">Пользователи</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Управление доступом и правами пользователей системы.
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Всего:</span>
                <span className="font-medium">25</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Онлайн:</span>
                <span className="font-medium text-green-600">8</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Администраторы:</span>
                <span className="font-medium">3</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Server className="w-6 h-6 text-orange-600" />
              <h2 className="text-xl font-semibold">Серверы</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Статус и мониторинг всех серверов системы.
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">PostgreSQL:</span>
                <span className="font-medium text-green-600">Работает</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Mumble:</span>
                <span className="font-medium text-green-600">Работает</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">PostgREST:</span>
                <span className="font-medium text-green-600">Работает</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-6 h-6 text-red-600" />
              <h2 className="text-xl font-semibold">Активность системы</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">99.9%</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Uptime</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">24/7</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Мониторинг</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-600">156</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Событий сегодня</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <div className="text-2xl font-bold text-orange-600">0</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Ошибок</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Admin Settings Modal */}
      <AdminSettings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
