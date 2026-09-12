import { useState } from 'react';
import { Settings, X, Save, Radio, Server, Database, Users, Shield } from 'lucide-react';
import { AudioControl } from './AudioControl';

interface AdminSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSettings({ isOpen, onClose }: AdminSettingsProps) {
  const [activeTab, setActiveTab] = useState<'audio' | 'servers' | 'users' | 'system'>('audio');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold">Настройки администратора</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('audio')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === 'audio'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Radio className="w-5 h-5" />
            Аудио
          </button>
          <button
            onClick={() => setActiveTab('servers')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === 'servers'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Server className="w-5 h-5" />
            Серверы
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === 'users'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Users className="w-5 h-5" />
            Пользователи
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === 'system'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Shield className="w-5 h-5" />
            Система
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'audio' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Управление аудио</h3>
                <AudioControl />
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Альтернативный вариант: mumble-web
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                  Вы также можете использовать отдельный веб-интерфейс mumble-web для управления аудио:
                </p>
                <a
                  href={`http://${window.location.hostname}:8081`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  <Radio className="w-4 h-4" />
                  Открыть mumble-web
                </a>
              </div>
            </div>
          )}

          {activeTab === 'servers' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Настройки серверов</h3>
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Mumble Server</h4>
                    <div className="space-y-2">
                      <div>
                        <label className="text-sm font-medium">Хост</label>
                        <input
                          type="text"
                          defaultValue="localhost"
                          className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Порт</label>
                        <input
                          type="number"
                          defaultValue="64738"
                          className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <h4 className="font-medium mb-2">PostgreSQL</h4>
                    <div className="space-y-2">
                      <div>
                        <label className="text-sm font-medium">Хост</label>
                        <input
                          type="text"
                          defaultValue="localhost"
                          className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Порт</label>
                        <input
                          type="number"
                          defaultValue="5432"
                          className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <h4 className="font-medium mb-2">MediaMTX</h4>
                    <div className="space-y-2">
                      <div>
                        <label className="text-sm font-medium">RTSP порт</label>
                        <input
                          type="number"
                          defaultValue="8554"
                          className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">HLS порт</label>
                        <input
                          type="number"
                          defaultValue="8888"
                          className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                  <Save className="w-4 h-4" />
                  Сохранить настройки
                </button>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Управление пользователями</h3>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Управление пользователями и правами доступа осуществляется через панель управления доступом.
                  </p>
                  <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                    <Users className="w-4 h-4" />
                    Открыть управление доступом
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Системные настройки</h3>
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Информация о системе</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Версия:</span>
                        <span className="font-medium">1.0.0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Сборка:</span>
                        <span className="font-medium">2026-09-12</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Режим:</span>
                        <span className="font-medium">Production</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Логи системы</h4>
                    <div className="space-y-2">
                      <button className="w-full text-left bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-2 rounded transition-colors">
                        Просмотр логов приложения
                      </button>
                      <button className="w-full text-left bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-2 rounded transition-colors">
                        Просмотр логов серверов
                      </button>
                      <button className="w-full text-left bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-2 rounded transition-colors">
                        Экспорт логов
                      </button>
                    </div>
                  </div>

                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <h4 className="font-medium text-red-900 dark:text-red-100 mb-2">Опасная зона</h4>
                    <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                      Эти действия необратимы. Будьте осторожны.
                    </p>
                    <div className="space-y-2">
                      <button className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                        Очистить кэш
                      </button>
                      <button className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                        Сбросить настройки
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
