import React, { useState, useCallback } from 'react';
import './App.css';
import SpeechRecognition from './components/SpeechRecognition';
import TranscriptDisplay from './components/TranscriptDisplay';

function App() {
  // 確定した文字起こし結果
  const [transcripts, setTranscripts] = useState<string[]>(['', '']);
  // 未確定の文字起こし結果（表示用）
  const [interimTranscripts, setInterimTranscripts] = useState<string[]>(['', '']);
  
  // 文字起こし結果の更新
  const handleTranscriptUpdate = useCallback((channelId: number, transcript: string, isFinal: boolean) => {
    if (isFinal) {
      // 確定した結果の場合、永続的に保存
      if (transcript.trim()) {
        setTranscripts(prev => {
          const newTranscripts = [...prev];
          
          // 既存のテキストがある場合は改行を追加
          if (prev[channelId] && prev[channelId].trim()) {
            newTranscripts[channelId] = prev[channelId] + '\n' + transcript;
          } else {
            newTranscripts[channelId] = transcript;
          }
          
          return newTranscripts;
        });
      }
      
      // 確定したので未確定テキストをクリア
      setInterimTranscripts(prev => {
        const newInterim = [...prev];
        newInterim[channelId] = '';
        return newInterim;
      });
    } else {
      // 未確定の結果の場合、一時的に表示
      setInterimTranscripts(prev => {
        const newInterim = [...prev];
        newInterim[channelId] = transcript;
        return newInterim;
      });
    }
  }, []);

  // 文字起こし結果のクリア
  const clearTranscripts = () => {
    setTranscripts(['', '']);
    setInterimTranscripts(['', '']);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>音声認識アプリ</h1>
        <p>2チャンネル同時音声認識</p>
      </header>
      
      <main className="App-main">
        <SpeechRecognition onTranscriptUpdate={handleTranscriptUpdate} />
        <div className="transcript-controls">
          <button onClick={clearTranscripts} className="clear-button">
            文字起こし結果をクリア
          </button>
        </div>
        <TranscriptDisplay 
          transcripts={transcripts} 
          channelColors={['#e6f7ff', '#fff0f6']}
          interimTranscripts={interimTranscripts}
        />
      </main>
      
      <footer className="App-footer">
        <p>Web Speech Recognition APIを使用</p>
        <p className="note">※確定した文字起こし結果のみ保持されます</p>
      </footer>
    </div>
  );
}

export default App;
