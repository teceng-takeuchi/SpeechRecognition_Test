# 2チャンネル同時音声認識アプリ

このプロジェクトは、Web Speech Recognition APIを使用して2つの異なるマイク入力から同時に音声認識を行い、文字起こしを表示するReactアプリケーションです。

## 概要

このアプリケーションは以下の機能を提供します：

- 2つの異なるマイク入力からの同時音声認識
- リアルタイムでの文字起こし表示（確定/未確定テキスト）
- 各チャンネルごとの文字起こし結果の表示
- 文字起こし結果のクリア機能

## システム構成

アプリケーションは以下のコンポーネントで構成されています：

- **App**: メインアプリケーションコンポーネント
- **SpeechRecognition**: 音声認識機能を提供するコンポーネント
- **TranscriptDisplay**: 文字起こし結果を表示するコンポーネント

## シーケンス図

以下は、音声認識処理のシーケンス図です：

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant App as Appコンポーネント
    participant SR as SpeechRecognitionコンポーネント
    participant API as Web Speech API
    participant TD as TranscriptDisplayコンポーネント
    
    User->>SR: マイクデバイスを選択
    SR->>API: 音声認識開始
    User->>SR: 録音開始ボタンをクリック
    SR->>API: 音声認識開始
    
    loop 音声認識処理
        API->>SR: 音声認識結果（未確定）
        SR->>App: onTranscriptUpdate(channelId, text, false)
        App->>TD: interimTranscripts更新
        
        API->>SR: 音声認識結果（確定）
        SR->>App: onTranscriptUpdate(channelId, text, true)
        App->>TD: transcripts更新
    end
    
    User->>SR: 録音停止ボタンをクリック
    SR->>API: 音声認識停止
    
    User->>App: クリアボタンをクリック
    App->>TD: transcripts & interimTranscripts クリア
```

## コンポーネント図

アプリケーションのコンポーネント構造は以下の通りです：

```mermaid
graph TD
    A[App] --> B[SpeechRecognition]
    A --> C[TranscriptDisplay]
    B -- onTranscriptUpdate --> A
    A -- transcripts/interimTranscripts --> C
```

## データフロー

```mermaid
flowchart LR
    A[マイク入力] --> B[Web Speech API]
    B --> C{音声認識処理}
    C -->|未確定テキスト| D[interimTranscripts]
    C -->|確定テキスト| E[transcripts]
    D --> F[TranscriptDisplay]
    E --> F
```

## 技術スタック

- React 19.0.0
- TypeScript 4.9.5
- Web Speech Recognition API
- Create React App

## 使用方法

1. アプリケーションを起動します
2. 各チャンネルのマイクデバイスを選択します
3. 「録音開始」ボタンをクリックして音声認識を開始します
4. 話した内容がリアルタイムで文字起こしされます
5. 「録音停止」ボタンをクリックして音声認識を停止します
6. 「文字起こし結果をクリア」ボタンで結果をクリアできます

## 注意事項

- Web Speech Recognition APIはブラウザによってサポート状況が異なります
- 最新のChrome、Edge、Safariでの使用を推奨します
- 確定した文字起こし結果のみ保持されます
