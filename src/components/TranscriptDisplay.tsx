import React, { useRef, useEffect } from 'react';

interface TranscriptDisplayProps {
  transcripts: string[];
  channelColors: string[];
  interimTranscripts?: string[]; // 未確定の文字起こし結果（オプション）
}

const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({ 
  transcripts, 
  channelColors,
  interimTranscripts = ['', ''] 
}) => {
  // 各チャンネルの文字起こし結果の参照
  const transcriptRefs = useRef<(HTMLDivElement | null)[]>([null, null]);

  // 新しい文字起こし結果が追加されたら、自動的にスクロールを一番下に移動
  useEffect(() => {
    transcripts.forEach((_, index) => {
      const transcriptElement = transcriptRefs.current[index];
      if (transcriptElement) {
        transcriptElement.scrollTop = transcriptElement.scrollHeight;
      }
    });
  }, [transcripts, interimTranscripts]);

  // refを設定する関数
  const setRef = (index: number) => (el: HTMLDivElement | null) => {
    transcriptRefs.current[index] = el;
  };

  return (
    <div className="transcript-display">
      <h2>文字起こし結果</h2>
      <div className="transcripts">
        {transcripts.map((transcript, index) => {
          const hasInterim = interimTranscripts[index] && interimTranscripts[index].trim() !== '';
          const hasContent = transcript.trim() !== '' || hasInterim;
          
          return (
            <div 
              key={index} 
              className="transcript" 
              style={{ backgroundColor: channelColors[index] }}
            >
              <h3>チャンネル {index + 1}</h3>
              <div 
                ref={setRef(index)}
                className="transcript-content"
              >
                {/* 確定した文字起こし結果 */}
                {transcript.trim() !== '' ? (
                  transcript.split('\n').map((line, i) => (
                    <p key={`final-${i}`} className="final-transcript">{line || ' '}</p>
                  ))
                ) : null}
                
                {/* 未確定の文字起こし結果 */}
                {hasInterim && (
                  <div className="interim-container">
                    {transcript.trim() !== '' && <div className="interim-separator"></div>}
                    <p className="interim-transcript">{interimTranscripts[index]}</p>
                  </div>
                )}
                
                {/* 何も表示するものがない場合 */}
                {!hasContent && (
                  <p className="waiting-message">（文字起こし待機中...）</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TranscriptDisplay; 