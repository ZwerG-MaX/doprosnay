import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Settings, Radio } from 'lucide-react';

interface AudioControlProps {
  onStatusChange?: (status: 'connected' | 'disconnected' | 'error') => void;
}

export function AudioControl({ onStatusChange }: AudioControlProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [volume, setVolume] = useState(100);
  const [inputVolume, setInputVolume] = useState(100);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [users, setUsers] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Подключение к mumble-web-proxy через WebSocket
  const connect = async () => {
    try {
      setStatus('connecting');
      
      // Получаем доступ к микрофону
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      mediaStreamRef.current = stream;

      // Подключаемся к mumble-web-proxy
      const wsUrl = `ws://${window.location.hostname}:64737`;
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('Connected to Mumble proxy');
        setStatus('connected');
        setIsConnected(true);
        onStatusChange?.('connected');
      };

      ws.onmessage = (event) => {
        // Обработка сообщений от Mumble
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'users') {
            setUsers(data.users || []);
          }
        } catch (e) {
          console.error('Error parsing message:', e);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus('error');
        onStatusChange?.('error');
      };

      ws.onclose = () => {
        console.log('Disconnected from Mumble proxy');
        setStatus('disconnected');
        setIsConnected(false);
        onStatusChange?.('disconnected');
      };

      wsRef.current = ws;

      // Создаем AudioContext для обработки звука
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      // Создаем источник звука из микрофона
      const source = audioContext.createMediaStreamSource(stream);
      
      // Создаем анализатор для визуализации
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

    } catch (error) {
      console.error('Error connecting to audio:', error);
      setStatus('error');
      onStatusChange?.('error');
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsConnected(false);
    setStatus('disconnected');
    onStatusChange?.('disconnected');
  };

  const toggleMute = () => {
    if (mediaStreamRef.current) {
      const audioTracks = mediaStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleDeafen = () => {
    setIsDeafened(!isDeafened);
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Radio className="w-6 h-6" />
          Аудиоконтроль
        </h2>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            status === 'connected' ? 'bg-green-500' :
            status === 'connecting' ? 'bg-yellow-500 animate-pulse' :
            status === 'error' ? 'bg-red-500' :
            'bg-gray-400'
          }`} />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {status === 'connected' ? 'Подключено' :
             status === 'connecting' ? 'Подключение...' :
             status === 'error' ? 'Ошибка' :
             'Отключено'}
          </span>
        </div>
      </div>

      {/* Управление подключением */}
      <div className="mb-6">
        {!isConnected ? (
          <button
            onClick={connect}
            disabled={status === 'connecting'}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'connecting' ? 'Подключение...' : 'Подключиться к Mumble'}
          </button>
        ) : (
          <button
            onClick={disconnect}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Отключиться
          </button>
        )}
      </div>

      {/* Управление микрофоном и звуком */}
      {isConnected && (
        <div className="space-y-4">
          {/* Кнопки управления */}
          <div className="flex gap-2">
            <button
              onClick={toggleMute}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors ${
                isMuted
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200'
              }`}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              {isMuted ? 'Включить микрофон' : 'Выключить микрофон'}
            </button>
            <button
              onClick={toggleDeafen}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors ${
                isDeafened
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200'
              }`}
            >
              {isDeafened ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              {isDeafened ? 'Включить звук' : 'Выключить звук'}
            </button>
          </div>

          {/* Регуляторы громкости */}
          <div className="space-y-3">
            <div>
              <label className="flex items-center justify-between text-sm font-medium mb-2">
                <span className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  Громкость выхода
                </span>
                <span className="text-gray-600 dark:text-gray-400">{volume}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                disabled={isDeafened}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
              />
            </div>

            <div>
              <label className="flex items-center justify-between text-sm font-medium mb-2">
                <span className="flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  Громкость входа
                </span>
                <span className="text-gray-600 dark:text-gray-400">{inputVolume}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={inputVolume}
                onChange={(e) => setInputVolume(Number(e.target.value))}
                disabled={isMuted}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
              />
            </div>
          </div>

          {/* Список пользователей */}
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Пользователи в комнате ({users.length})
            </h3>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 max-h-48 overflow-y-auto">
              {users.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                  Нет пользователей в комнате
                </p>
              ) : (
                <ul className="space-y-1">
                  {users.map((user, index) => (
                    <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      {user}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Информация */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Подключение к Mumble серверу через WebSocket proxy. 
          Убедитесь, что mumble-web-proxy запущен и доступен на порту 64737.
        </p>
      </div>
    </div>
  );
}
