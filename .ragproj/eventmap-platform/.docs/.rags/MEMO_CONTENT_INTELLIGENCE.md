# 🧠 Memo & Content Intelligence Specification (v25.0)

## 1. Overview
Kuzmo의 '추억(Memo)'은 단순한 데이터 저장을 넘어, 오디오와 시각 데이터를 고해상도로 보존하고 AI가 이를 입체적으로 이해하도록 설계되었습니다.

---

## 2. Hi-Fi Audio Intelligence (v21.0)
### 🎧 오디오 마스터링 및 시맨틱 보존
- 목적: 오디오 데이터 전송/저장 시 정보 손실을 최소화하고 시맨틱 임베딩의 품질을 확보.
- 매커니즘:
    - Opus v21.0 High-Profile: 128kbps 가변 비트레이트 강제 적용 (스포티파이급 해상도).
    - Lossless Pass-Through: 파일 업로드 시 재인코딩 없는 원본 바이트 보존 전략.
    - Worker-Side Preprocessing: audio_optimizer.js를 통해 메인 스레드 부하 없이 오디오 버퍼를 고속 처리.
- 데이터 구조:
    ```yaml
    audio_intel:
      fidelity: "v21.0_HiFi"
      bitrate: "128kbps"
      codec: "opus"
    ```

---

## 3. Sketch-to-Data Multimodal Layer (v22.8)
### 🎨 고성능 드로잉 엔진 및 지능형 입력 (Ink Engine)
- 목적: 사용자의 원초적인 낙서와 필기를 고해상도 벡터 데이터로 보존하고 AI Vision 레이어에 최적화된 형식으로 전달.
- 입력 지능 (Active Stylus & Palm Rejection):
    - Pointer Type Discrimination: 표준 W3C Pointer Events를 사용하여 Pen, Mouse, Touch를 실시간으로 구분.
    - Active Pen Priority: 전용 펜(S-Pen, Apple Pencil 등) 감지 시 1초간 손가락 터치를 소프트웨어적으로 차단하여 필기 안정성을 확보.
    - Area-Based Palm Rejection: 접촉 면적(width/height)이 25px를 초과하는 신호를 손바닥으로 간주하여 필터링.
- 렌더링 퍼포먼스:
    - Desynchronized Mode: 캔버스 컨텍스트의 desynchronized: true 옵션을 통해 브라우저 루프를 우회하는 초저지연 드로잉 구현.
    - Bézier Curve Smoothing: 2차 베지어 곡선(quadraticCurveTo) 보간 알고리즘을 사용하여 부드러운 필기감 제공.

### 🔍 스케치 분석 및 지능형 객체 변환
- 매커니즘:
    - SVG Layer (XML-Serialized): LLM이 이미지처럼 읽을 수 있는 텍스트 기반 벡터 데이터 생성.
    - Multi-modal Export: AI 분석용 SVG 데이터와 시각적 미리보기용 PNG DataURL을 동시 생성하여 KZM 패킷에 저장.

---

## 4. Multi-modal Packet Integration (KZM v1.2)
모든 지능형 데이터는 .kzm 패킷 내부의 content.md 및 메타데이터에 결합되어 저장됩니다.
- Audio Embed: > [!AUDIO] Quality: Hi-Fi Opus (128kbps)
- Vision Descriptor: AI가 분석한 스케치 내용을 마크다운 주석으로 자동 기록하여 검색 엔진(RAG)에 반영.

---

> [!TIP]
> **Performance Note**: Flash 모델을 사용하여 비용과 속도를 최적화(v22.60)하고 있으며, 대용량 바이너리 전송 시에는 Transferable 객체를 사용하여 성능 저하를 방지합니다.
