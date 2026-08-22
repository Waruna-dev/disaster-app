import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createReport } from "../api/reports";
import Navbar from "./Navbar";
import Footer from "./Footer";
import "./SubmitReport.css";

const INCIDENT_TYPES = [
  { id: "flood", label: "Flood", color: "#2563eb", icon: "droplet" },
  { id: "fire", label: "Fire", color: "#dc2626", icon: "flame" },
  { id: "road-block", label: "Road Block", color: "#b45309", icon: "barrier" },
  { id: "medical", label: "Medical Need", color: "#dc2626", icon: "medical" },
  { id: "power-outage", label: "Power Outage", color: "#4b5563", icon: "power-off" },
  { id: "other", label: "Other", color: "#4b5563", icon: "dots" },
];

const WATER_LEVELS = [
  {
    id: "low",
    label: "Low",
    hint: "Ankle-deep, roads passable",
    color: "#2563eb",
  },
  {
    id: "medium",
    label: "Medium",
    hint: "Knee-to-waist deep, caution advised",
    color: "#d97706",
  },
  {
    id: "high",
    label: "High",
    hint: "Waist-deep or higher, dangerous",
    color: "#dc2626",
  },
];

function Icon({ name, size = 26, color = "currentColor" }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  switch (name) {
    case "droplet":
      return (
        <svg {...common}>
          <path d="M12 2.5s6.5 7.2 6.5 12A6.5 6.5 0 1 1 5.5 14.5C5.5 9.7 12 2.5 12 2.5Z" />
        </svg>
      );
    case "flame":
      return (
        <svg {...common}>
          <path d="M12 22c4 0 6.5-2.6 6.5-6.2 0-2.7-1.5-4.5-2.6-6-.4 1.3-1 2.2-1.8 2.7.2-2.7-.9-5.6-3.3-7.5.4 2-.2 3.6-1.6 5C7.6 11.5 6 12.9 6 15.8 6 19.4 8 22 12 22Z" />
        </svg>
      );
    case "barrier":
      return (
        <svg {...common}>
          <path d="M3 8h5l1.5-3h5L16 8h5" />
          <path d="M3 16h5l1.5 3h5l1.5-3h5" />
          <line x1="3" y1="12" x2="21" y2="12" />
        </svg>
      );
    case "medical":
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="12" y1="11" x2="12" y2="17" />
          <line x1="9" y1="14" x2="15" y2="14" />
        </svg>
      );
    case "power-off":
      return (
        <svg {...common}>
          <path d="M18.4 6.6a9 9 0 1 1-12.8 0" />
          <line x1="12" y1="2" x2="12" y2="12" />
          <line x1="3" y1="3" x2="21" y2="21" />
        </svg>
      );
    case "dots":
      return (
        <svg {...common}>
          <circle cx="5" cy="12" r="1.6" fill={color} stroke="none" />
          <circle cx="12" cy="12" r="1.6" fill={color} stroke="none" />
          <circle cx="19" cy="12" r="1.6" fill={color} stroke="none" />
        </svg>
      );
    case "pin":
      return (
        <svg {...common}>
          <path d="M12 21s7-6.6 7-11.5A7 7 0 0 0 5 9.5C5 14.4 12 21 12 21Z" />
          <circle cx="12" cy="9.5" r="2.3" />
        </svg>
      );
    case "info":
      return (
        <svg {...common} strokeWidth={2}>
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="10.5" x2="12" y2="16" />
          <circle cx="12" cy="7.6" r="0.15" fill={color} stroke={color} />
        </svg>
      );
    case "camera":
      return (
        <svg {...common}>
          <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
          <circle cx="12" cy="13.5" r="3.3" />
        </svg>
      );
    case "send":
      return (
        <svg {...common} fill={color} stroke="none">
          <path d="M3 11.5 20.5 4 13 21.5l-2.6-6.9L3 11.5Z" />
        </svg>
      );
    case "phone":
      return (
        <svg {...common} strokeWidth={2}>
          <path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.5 21 3 13.5 3 4c0-.6.4-1 1-1h3.2c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1L6.6 10.8Z" />
        </svg>
      );
    case "menu":
      return (
        <svg {...common} strokeWidth={2}>
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      );
    case "logo":
      return (
        <svg {...common} fill={color} stroke="none">
          <path d="M12 2l1.8 4.6L18.5 8l-4.7 1.4L12 14l-1.8-4.6L5.5 8l4.7-1.4L12 2z" />
          <path d="M19 13l.9 2.3L22.2 16l-2.3.7L19 19l-.9-2.3L15.8 16l2.3-.7L19 13z" />
        </svg>
      );
    case "mic":
      return (
        <svg {...common} strokeWidth={2}>
          <rect x="9" y="2.5" width="6" height="11" rx="3" />
          <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
          <line x1="12" y1="17.5" x2="12" y2="21" />
          <line x1="8.5" y1="21" x2="15.5" y2="21" />
        </svg>
      );
    case "stop":
      return (
        <svg {...common} fill={color} stroke="none">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      );
    case "trash":
      return (
        <svg {...common} strokeWidth={2}>
          <line x1="4" y1="7" x2="20" y2="7" />
          <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
          <path d="M9.5 7V4.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V7" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      );
    case "refresh":
      return (
        <svg {...common} strokeWidth={2}>
          <path d="M4 4.5v5h5" />
          <path d="M20 19.5v-5h-5" />
          <path d="M5 14.5a8 8 0 0 0 14.3 3.2M19 9.5A8 8 0 0 0 4.7 6.3" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common} strokeWidth={2}>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      );
    case "close":
      return (
        <svg {...common} strokeWidth={2.4}>
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
      );
    case "play":
      return (
        <svg {...common} fill={color} stroke="none">
          <path d="M8 5.5v13l11-6.5-11-6.5Z" />
        </svg>
      );
    case "check-circle":
      return (
        <svg {...common} strokeWidth={2}>
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12.3l2.5 2.5L16 9.3" />
        </svg>
      );
    default:
      return null;
  }
}

function formatDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

const VOICE_SUPPORTED =
  typeof navigator !== "undefined" &&
  !!navigator.mediaDevices &&
  typeof window !== "undefined" &&
  !!window.MediaRecorder;

export default function SubmitReport() {
  const navigate = useNavigate();
  const [incidentType, setIncidentType] = useState(null);
  const [waterLevel, setWaterLevel] = useState(null);
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [incidentTypeError, setIncidentTypeError] = useState("");
  const [locationRequiredError, setLocationRequiredError] = useState("");
  const [details, setDetails] = useState("");
  const [mediaItems, setMediaItems] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedId, setSubmittedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const fileInputRef = useRef(null);
  const successTimerRef = useRef(null);
  const mediaIdRef = useRef(0);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceNote, setVoiceNote] = useState(null); // { blob, url, seconds }
  const [voiceError, setVoiceError] = useState("");
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const secondsRef = useRef(0);

  useEffect(() => {
    return () => {
      mediaItems.forEach((item) => URL.revokeObjectURL(item.url));
      if (voiceNote?.url) URL.revokeObjectURL(voiceNote.url);
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (successTimerRef.current) window.clearTimeout(successTimerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectIncidentType = (id) => {
    setIncidentType(id);
    setIncidentTypeError("");
    if (id !== "flood") setWaterLevel(null);
  };

  const handleIdentifyLocation = () => {
    setLocationError("");
    setLocationRequiredError("");
    if (!navigator.geolocation) {
      setLocationError("Location services aren't available on this device.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocating(false);
      },
      () => {
        setLocationError("Couldn't access your location. Please allow location access.");
        setLocating(false);
      }
    );
  };

  const handleFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      const newItems = files.map((file) => {
        mediaIdRef.current += 1;
        return {
          id: mediaIdRef.current,
          file,
          url: URL.createObjectURL(file),
          isImage: file.type.startsWith("image/"),
          isVideo: file.type.startsWith("video/"),
        };
      });
      setMediaItems((prev) => [...prev, ...newItems]);
    }
    // reset so selecting the same file again still fires onChange
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddMediaClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveMediaItem = (id) => {
    setMediaItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((item) => item.id !== id);
    });
  };

  const startRecording = async () => {
    setVoiceError("");
    if (!VOICE_SUPPORTED) {
      setVoiceError("Voice recording isn't supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];
      const recorder = new window.MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const url = URL.createObjectURL(blob);
        setVoiceNote((prev) => {
          if (prev?.url) URL.revokeObjectURL(prev.url);
          return { blob, url, seconds: secondsRef.current };
        });
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      recorder.start();
      secondsRef.current = 0;
      setRecordingSeconds(0);
      setIsRecording(true);
      timerRef.current = window.setInterval(() => {
        secondsRef.current += 1;
        setRecordingSeconds(secondsRef.current);
      }, 1000);
    } catch (err) {
      setVoiceError("Couldn't access your microphone. Please allow microphone access.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleRemoveVoiceNote = () => {
    if (voiceNote?.url) URL.revokeObjectURL(voiceNote.url);
    setVoiceNote(null);
    setRecordingSeconds(0);
  };

  const handleReRecord = () => {
    handleRemoveVoiceNote();
    startRecording();
  };

  const resetForm = () => {
    setIncidentType(null);
    setWaterLevel(null);
    setLocation(null);
    setLocationError("");
    setIncidentTypeError("");
    setLocationRequiredError("");
    setDetails("");
    mediaItems.forEach((item) => URL.revokeObjectURL(item.url));
    setMediaItems([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (voiceNote?.url) URL.revokeObjectURL(voiceNote.url);
    setVoiceNote(null);
    setRecordingSeconds(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setIncidentTypeError("");
    setLocationRequiredError("");

    let hasError = false;

    if (!incidentType) {
      setIncidentTypeError("Please select the kind of incident you're reporting.");
      hasError = true;
    } else if (incidentType === "flood" && !waterLevel) {
      setSubmitError("Please select a water level for the flood report.");
      hasError = true;
    }

    if (!location) {
      setLocationRequiredError("Please identify your location.");
      hasError = true;
    }

    if (hasError) return;

    const formData = new FormData();
    formData.append("incidentType", incidentType);
    if (incidentType === "flood" && waterLevel) formData.append("waterLevel", waterLevel);
    if (location) {
      formData.append("lat", location.lat);
      formData.append("lng", location.lng);
    }
    formData.append("details", details);
    mediaItems.forEach((item) => formData.append("media", item.file));
    if (voiceNote?.blob) {
      formData.append("voiceNote", voiceNote.blob, "voice-report.webm");
    }

    setSubmitting(true);
    try {
      const result = await createReport(formData);
      setSubmitted(true);
      setSubmittedId(result?.data?._id || null);
      resetForm();
      if (successTimerRef.current) window.clearTimeout(successTimerRef.current);
      successTimerRef.current = window.setTimeout(() => navigate("/"), 2200);
    } catch (err) {
      setSubmitError(
        err.message || "Couldn't send your report. Check your connection and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismissSuccess = () => {
    if (successTimerRef.current) window.clearTimeout(successTimerRef.current);
    navigate("/");
  };

  return (
    <div className="sr-page">
      <Navbar />

      <main className="sr-main">
        <div className="sr-container">
          <h1 className="sr-title">Submit a Report</h1>
          <p className="sr-subtitle">
            Please provide details about the incident to help responders act quickly and
            efficiently. Your safety is the priority.
          </p>

          {submitted && (
            <div className="sr-success-overlay" role="status">
              <div className="sr-success-card">
                <span className="sr-success-icon">
                  <Icon name="check-circle" size={30} color="#ffffff" />
                </span>
                <span className="sr-success-title">Submit Successful</span>
                <span className="sr-success-subtitle">
                  Thank you — responders have been notified and will review it shortly.
                  {submittedId && (
                    <>
                      {" "}
                      Reference ID: <span className="sr-success-id">{submittedId}</span>
                    </>
                  )}
                </span>
                <button
                  type="button"
                  className="sr-success-btn"
                  onClick={handleDismissSuccess}
                >
                  Go to Home
                </button>
              </div>
            </div>
          )}

          <form className="sr-card" onSubmit={handleSubmit}>
            <section className="sr-field">
              <label className="sr-label">
                1. What kind of incident are you reporting?{" "}
                <span className="sr-required">*</span>
              </label>
              <div className="sr-incident-grid">
                {INCIDENT_TYPES.map((type) => (
                  <button
                    type="button"
                    key={type.id}
                    className={`sr-incident-btn ${
                      incidentType === type.id ? "sr-incident-btn-selected" : ""
                    }`}
                    onClick={() => handleSelectIncidentType(type.id)}
                    aria-pressed={incidentType === type.id}
                  >
                    <Icon name={type.icon} color={type.color} />
                    <span>{type.label}</span>
                  </button>
                ))}
              </div>

              {incidentTypeError && (
                <p className="sr-field-error">
                  <Icon name="info" size={14} color="#ba1a1a" />
                  <span>{incidentTypeError}</span>
                </p>
              )}

              {incidentType === "flood" && (
                <div className="sr-water-level">
                  <span className="sr-water-level-label">Water Level</span>
                  <div className="sr-water-level-options">
                    {WATER_LEVELS.map((level) => (
                      <button
                        type="button"
                        key={level.id}
                        className={`sr-water-level-btn ${
                          waterLevel === level.id ? "sr-water-level-btn-selected" : ""
                        }`}
                        style={{
                          "--sr-water-color": level.color,
                        }}
                        onClick={() => setWaterLevel(level.id)}
                        aria-pressed={waterLevel === level.id}
                      >
                        <span className="sr-water-level-dot" />
                        <span className="sr-water-level-text">
                          <span className="sr-water-level-name">{level.label}</span>
                          <span className="sr-water-level-hint">{level.hint}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="sr-field">
              <label className="sr-label">
                2. Where is it happening? <span className="sr-required">*</span>
              </label>
              <button
                type="button"
                className={`sr-location-btn ${
                  locationRequiredError ? "sr-location-btn-error" : ""
                }`}
                onClick={handleIdentifyLocation}
                disabled={locating}
              >
                <Icon name="pin" size={18} color="#004ac6" />
                <span>
                  {locating
                    ? "Locating..."
                    : location
                    ? `Location set (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})`
                    : "Identify My Location"}
                </span>
              </button>
              {locationRequiredError ? (
                <p className="sr-field-error">
                  <Icon name="info" size={14} color="#ba1a1a" />
                  <span>{locationRequiredError}</span>
                </p>
              ) : (
                <p className="sr-hint">
                  <Icon name="info" size={14} color="#6b7280" />
                  <span>
                    {locationError || "This helps responders pinpoint the issue faster."}
                  </span>
                </p>
              )}
            </section>

            <section className="sr-field">
              <label className="sr-label" htmlFor="sr-details">3. What's happening?</label>
              <textarea
                id="sr-details"
                className="sr-textarea"
                placeholder="Provide any additional details..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={4}
              />
            </section>

            <section className="sr-field">
              <label className="sr-label">4. Attach Photo or Video (Optional)</label>

              <input
                id="sr-media-input"
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="sr-visually-hidden"
                onChange={handleFilesChange}
              />

              {mediaItems.length === 0 ? (
                <label className="sr-upload-box" htmlFor="sr-media-input">
                  <span className="sr-upload-icon">
                    <Icon name="camera" size={22} color="#004ac6" />
                  </span>
                  <span className="sr-upload-title">Take Photo/Video</span>
                  <span className="sr-upload-subtitle">or tap to upload from gallery</span>
                </label>
              ) : (
                <div className="sr-media-grid">
                  {mediaItems.map((item) => (
                    <div className="sr-media-thumb" key={item.id}>
                      {item.isImage && <img src={item.url} alt={item.file.name} />}
                      {item.isVideo && (
                        <>
                          <video src={item.url} muted playsInline preload="metadata" />
                          <span className="sr-media-thumb-play">
                            <Icon name="play" size={14} color="#ffffff" />
                          </span>
                        </>
                      )}
                      {!item.isImage && !item.isVideo && (
                        <div className="sr-media-thumb-fallback">
                          <Icon name="camera" size={18} color="#004ac6" />
                        </div>
                      )}
                      <button
                        type="button"
                        className="sr-media-thumb-remove"
                        onClick={() => handleRemoveMediaItem(item.id)}
                        aria-label={`Remove ${item.file.name}`}
                      >
                        <Icon name="close" size={12} color="#ffffff" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="sr-media-add-tile"
                    onClick={handleAddMediaClick}
                    aria-label="Add another photo or video"
                  >
                    <Icon name="plus" size={20} color="#004ac6" />
                  </button>
                </div>
              )}

              <p className="sr-hint">
                <Icon name="info" size={14} color="#6b7280" />
                <span>
                  {mediaItems.length > 0
                    ? `${mediaItems.length} file${mediaItems.length > 1 ? "s" : ""} attached. Tap + to add more.`
                    : "You can attach more than one photo or video."}
                </span>
              </p>
            </section>

            <section className="sr-field">
              <label className="sr-label">5. Record a Voice Report (Optional)</label>

              {!voiceNote && !isRecording && (
                <button
                  type="button"
                  className="sr-voice-btn"
                  onClick={startRecording}
                  disabled={!VOICE_SUPPORTED}
                >
                  <span className="sr-voice-btn-icon">
                    <Icon name="mic" size={18} color="#004ac6" />
                  </span>
                  <span>Start Voice Recording</span>
                </button>
              )}

              {isRecording && (
                <div className="sr-voice-recording">
                  <span className="sr-voice-pulse" aria-hidden="true" />
                  <span className="sr-voice-timer">{formatDuration(recordingSeconds)}</span>
                  <span className="sr-voice-recording-label">Recording...</span>
                  <button
                    type="button"
                    className="sr-voice-stop-btn"
                    onClick={stopRecording}
                  >
                    <Icon name="stop" size={14} color="#ffffff" />
                    <span>Stop</span>
                  </button>
                </div>
              )}

              {voiceNote && !isRecording && (
                <div className="sr-voice-playback">
                  <audio src={voiceNote.url} controls className="sr-voice-audio" />
                  <div className="sr-voice-playback-actions">
                    <span className="sr-voice-duration">
                      {formatDuration(voiceNote.seconds)}
                    </span>
                    <button
                      type="button"
                      className="sr-voice-icon-btn"
                      onClick={handleReRecord}
                      aria-label="Re-record voice report"
                    >
                      <Icon name="refresh" size={15} color="#004ac6" />
                    </button>
                    <button
                      type="button"
                      className="sr-voice-icon-btn"
                      onClick={handleRemoveVoiceNote}
                      aria-label="Remove voice report"
                    >
                      <Icon name="trash" size={15} color="#dc2626" />
                    </button>
                  </div>
                </div>
              )}

              <p className="sr-hint">
                <Icon name="info" size={14} color="#6b7280" />
                <span>
                  {voiceError ||
                    (!VOICE_SUPPORTED
                      ? "Voice recording isn't supported in this browser."
                      : "Record a short voice memo if it's easier than typing.")}
                </span>
              </p>
            </section>

            {submitError && (
              <p className="sr-submit-error">
                <Icon name="info" size={14} color="#dc2626" />
                <span>{submitError}</span>
              </p>
            )}

            <button type="submit" className="sr-submit-btn" disabled={submitting}>
              <Icon name="send" size={16} color="#ffffff" />
              <span>
                {submitting ? "Sending..." : submitted ? "Report Sent" : "Send Report"}
              </span>
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
