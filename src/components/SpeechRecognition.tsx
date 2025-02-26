import React, { useState, useEffect, useRef } from 'react';

// Web Speech API の型定義
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
        confidence: number;
      };
      isFinal: boolean;
    };
    length: number;
  };
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

// SpeechRecognition インターフェースの定義
interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  // オプションのプロパティ
  mediaDevices?: {
    selectAudioDevice?: (deviceId: string) => void;
  };
  // チャンネルIDを追加（カスタムプロパティ）
  channelId?: number;
}

// グローバル型定義の拡張
declare global {
  interface Window {
    SpeechRecognition: {
      new(): SpeechRecognitionInstance;
    };
    webkitSpeechRecognition: {
      new(): SpeechRecognitionInstance;
    };
  }
}

interface SpeechRecognitionProps {
  onTranscriptUpdate: (channelId: number, transcript: string, isFinal: boolean) => void;
}

interface AudioDevice {
  deviceId: string;
  label: string;
}

const SpeechRecognition: React.FC<SpeechRecognitionProps> = ({ onTranscriptUpdate }) => {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>(['', '']);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const recognitionRefs = useRef<(SpeechRecognitionInstance | null)[]>([null, null]);
  // 各チャンネルの最後の未確定テキストを保持
  const lastInterimTranscripts = useRef<string[]>(['', '']);
  // AudioContextの参照を保持
  const audioContexts = useRef<(AudioContext | null)[]>([null, null]);
  const audioStreams = useRef<(MediaStream | null)[]>([null, null]);

  // デバイス一覧を取得
  useEffect(() => {
    const getDevices = async () => {
      try {
        // マイクへのアクセス許可を取得
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // デバイス一覧を取得
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputDevices = devices
          .filter(device => device.kind === 'audioinput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `マイク ${device.deviceId.slice(0, 5)}...`
          }));
        
        setDevices(audioInputDevices);
        
        // デバイスが見つかっても初期状態では何も選択しない（ユーザーが手動で選択する）
        // setSelectedDevices(['', '']); // 初期化時に既に設定済み
      } catch (error) {
        console.error('マイクデバイスの取得に失敗しました:', error);
      }
    };
    
    getDevices();
  }, []);

  // コンポーネントのクリーンアップ
  useEffect(() => {
    return () => {
      // 認識インスタンスを停止
      recognitionRefs.current.forEach(recognition => {
        if (recognition) {
          recognition.stop();
        }
      });
      
      // オーディオストリームをクリーンアップ
      audioStreams.current.forEach(stream => {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      });
      
      // AudioContextを閉じる
      audioContexts.current.forEach(context => {
        if (context && context.state !== 'closed') {
          context.close().catch(err => console.error('AudioContextの終了に失敗:', err));
        }
      });
    };
  }, []);

  // 録音開始
  const startRecording = () => {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      alert('お使いのブラウザは音声認識をサポートしていません。');
      return;
    }

    // 選択されたデバイスがあるか確認
    if (selectedDevices.every(deviceId => !deviceId)) {
      alert('少なくとも1つのマイクを選択してください。');
      return;
    }

    // 録音開始時に未確定テキストをクリア
    lastInterimTranscripts.current = ['', ''];
    
    // 既存のすべての認識インスタンスを停止
    recognitionRefs.current.forEach(recognition => {
      if (recognition) {
        recognition.stop();
      }
    });
    recognitionRefs.current = [null, null];
    
    // オーディオストリームをクリーンアップ
    audioStreams.current.forEach((stream, index) => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        audioStreams.current[index] = null;
      }
    });

    const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;

    // 録音状態を更新
    setIsRecording(true);

    // 各チャンネルの音声認識を開始（少し遅延させて安定性を向上）
    setTimeout(() => {
      selectedDevices.forEach(async (deviceId, index) => {
        if (!deviceId) return;

        console.log(`チャンネル ${index + 1} の録音を開始します。デバイスID: ${deviceId}`);
        
        try {
          // 特定のデバイスからのオーディオストリームを取得
          const constraints = {
            audio: {
              deviceId: { exact: deviceId }
            }
          };
          
          console.log(`チャンネル ${index + 1} のオーディオ制約:`, constraints);
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          console.log(`チャンネル ${index + 1} のストリーム取得成功:`, stream.id);
          audioStreams.current[index] = stream;
          
          // AudioContextを作成して接続（オプション - デバッグ用）
          if (!audioContexts.current[index]) {
            audioContexts.current[index] = new AudioContext();
            console.log(`チャンネル ${index + 1} のAudioContext作成:`, audioContexts.current[index]?.state);
          }
          
          const audioContext = audioContexts.current[index];
          if (audioContext) {
            const source = audioContext.createMediaStreamSource(stream);
            console.log(`チャンネル ${index + 1} のMediaStreamSource作成成功`);
            // ここでオーディオ処理を追加できます（必要に応じて）
            // source.connect(audioContext.destination); // 自分の声が聞こえるようにする場合
          }
          
          // 新しいインスタンスを作成
          const recognition = new SpeechRecognitionConstructor();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'ja-JP';
          
          // カスタムプロパティとしてチャンネルIDを設定
          (recognition as any).channelId = index;
          (recognition as any).deviceId = deviceId;
          console.log(`チャンネル ${index + 1} の認識インスタンス作成:`, { 
            channelId: index, 
            deviceId: deviceId,
            continuous: recognition.continuous,
            interimResults: recognition.interimResults,
            lang: recognition.lang
          });

          // デバイスIDを設定（注：標準のSpeechRecognition APIではデバイス選択はサポートされていないため、
          // 実際のデバイス選択は制限される場合があります）
          try {
            if (recognition.mediaDevices && recognition.mediaDevices.selectAudioDevice) {
              recognition.mediaDevices.selectAudioDevice(deviceId);
            }
          } catch (error) {
            console.warn('デバイス選択がサポートされていません:', error);
          }

          recognition.onresult = (event: SpeechRecognitionEvent) => {
            // 現在の認識結果を取得
            let finalTranscript = '';
            let interimTranscript = '';

            // 結果を処理
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const result = event.results[i];
              const transcript = result[0].transcript;
              
              if (result.isFinal) {
                finalTranscript += transcript;
              } else {
                interimTranscript += transcript;
              }
            }

            // 認識インスタンスとチャンネルの対応を確認
            // カスタムプロパティからチャンネルIDを取得（フォールバックとしてindexを使用）
            const currentChannelId = (recognition as any).channelId !== undefined ? (recognition as any).channelId : index;
            const deviceId = (recognition as any).deviceId || 'unknown';
            
            console.log(`チャンネル ${currentChannelId + 1} (デバイスID: ${deviceId.slice(0, 8)}...) の認識結果:`, { 
              finalTranscript, 
              interimTranscript,
              resultIndex: event.resultIndex,
              resultsLength: event.results.length
            });

            // 確定した結果がある場合
            if (finalTranscript) {
              console.log(`チャンネル ${currentChannelId + 1} の確定結果を更新:`, finalTranscript);
              onTranscriptUpdate(currentChannelId, finalTranscript, true);
              lastInterimTranscripts.current[currentChannelId] = '';
            }
            
            // 未確定の結果がある場合
            if (interimTranscript) {
              console.log(`チャンネル ${currentChannelId + 1} の未確定結果を更新:`, interimTranscript);
              lastInterimTranscripts.current[currentChannelId] = interimTranscript;
              onTranscriptUpdate(currentChannelId, interimTranscript, false);
            }
          };

          recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error(`音声認識エラー (チャンネル ${index + 1}):`, event.error);
            
            // エラーが「aborted」以外の場合、認識を再開する試み
            if (event.error !== 'aborted' && isRecording) {
              try {
                setTimeout(() => {
                  if (isRecording && recognitionRefs.current[index] === recognition) {
                    console.log(`チャンネル ${index + 1} の認識を再開します...`);
                    recognition.start();
                  }
                }, 1000);
              } catch (e) {
                console.error(`チャンネル ${index + 1} の認識再開に失敗:`, e);
              }
            }
          };
          
          // 認識セッションが終了した場合の処理
          recognition.onend = () => {
            console.log(`チャンネル ${index + 1} の認識セッションが終了しました`);
            
            // 録音中であれば自動的に再開
            if (isRecording && recognitionRefs.current[index] === recognition) {
              try {
                console.log(`チャンネル ${index + 1} の認識を再開します...`);
                recognition.start();
              } catch (e) {
                console.error(`チャンネル ${index + 1} の認識再開に失敗:`, e);
              }
            }
          };

          recognition.start();
          recognitionRefs.current[index] = recognition;
        } catch (error) {
          console.error(`チャンネル ${index + 1} の録音開始に失敗しました:`, error);
        }
      });
    }, 500); // 500ms遅延させて安定性を向上
  };

  // 録音停止
  const stopRecording = () => {
    // 認識インスタンスを停止
    recognitionRefs.current.forEach(recognition => {
      if (recognition) {
        recognition.stop();
      }
    });
    recognitionRefs.current = [null, null];
    
    // オーディオストリームをクリーンアップ
    audioStreams.current.forEach((stream, index) => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        audioStreams.current[index] = null;
      }
    });
    
    // AudioContextを閉じる（オプション）
    audioContexts.current.forEach((context, index) => {
      if (context && context.state !== 'closed') {
        context.close().catch(err => console.error(`AudioContext ${index} の終了に失敗:`, err));
        audioContexts.current[index] = null;
      }
    });
    
    setIsRecording(false);
    
    // 録音停止時に未確定テキストをクリア
    lastInterimTranscripts.current.forEach((_, index) => {
      onTranscriptUpdate(index, '', false);
    });
    lastInterimTranscripts.current = ['', ''];
  };

  // デバイス選択の変更
  const handleDeviceChange = (channelId: number, deviceId: string) => {
    const newSelectedDevices = [...selectedDevices];
    
    // 以前のデバイスと同じ場合は何もしない
    if (newSelectedDevices[channelId] === deviceId) {
      return;
    }
    
    newSelectedDevices[channelId] = deviceId;
    setSelectedDevices(newSelectedDevices);
    
    // 関連するオーディオストリームをクリーンアップ
    if (audioStreams.current[channelId]) {
      audioStreams.current[channelId]?.getTracks().forEach(track => track.stop());
      audioStreams.current[channelId] = null;
    }
    
    // 録音中の場合は再起動
    if (isRecording) {
      stopRecording();
      startRecording();
    }
  };

  // 特定のチャンネル用に利用可能なデバイスをフィルタリング
  const getAvailableDevicesForChannel = (channelId: number) => {
    const otherChannelId = channelId === 0 ? 1 : 0;
    const otherChannelDevice = selectedDevices[otherChannelId];
    
    // 他のチャンネルで選択されていないデバイスのみを返す
    return devices.filter(device => 
      // 現在選択中のデバイスか、または他のチャンネルで選択されていないデバイス
      device.deviceId === selectedDevices[channelId] || device.deviceId !== otherChannelDevice
    );
  };

  return (
    <div className="speech-recognition">
      <h2>音声認識設定</h2>
      
      <div className="channels">
        {[0, 1].map(channelId => (
          <div key={channelId} className="channel">
            <h3>チャンネル {channelId + 1}</h3>
            <select 
              value={selectedDevices[channelId]} 
              onChange={(e) => handleDeviceChange(channelId, e.target.value)}
              disabled={isRecording}
            >
              <option value="">マイクを選択してください</option>
              {getAvailableDevicesForChannel(channelId).map(device => (
                <option key={`${channelId}-${device.deviceId}`} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
            {selectedDevices[channelId] === '' && devices.length > 0 && (
              <p className="device-warning">マイクを選択してください</p>
            )}
          </div>
        ))}
      </div>

      <div className="controls">
        {!isRecording ? (
          <button 
            onClick={startRecording} 
            disabled={selectedDevices.every(d => !d)}
          >
            録音開始
          </button>
        ) : (
          <button onClick={stopRecording}>
            録音停止
          </button>
        )}
      </div>
    </div>
  );
};

export default SpeechRecognition;