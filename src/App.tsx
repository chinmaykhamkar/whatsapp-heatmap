import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import Heatmap, { colorSchemes, ColorScheme } from './components/Heatmap';
import { parseWhatsAppChat, generateHeatmapData, getAvailableYears, DayData } from './utils/parser';
import './App.css';

function App() {
  const [heatmapData, setHeatmapData] = useState<DayData[]>([]);
  const [allMessagesByDate, setAllMessagesByDate] = useState<Map<string, number>>(new Map());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedScheme, setSelectedScheme] = useState<ColorScheme>(colorSchemes[0]);
  const [fileName, setFileName] = useState<string>('');
  const [chatName, setChatName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [tempChatName, setTempChatName] = useState<string>('');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'light' | 'dark') || 'light';
  });
  const [totalMessages, setTotalMessages] = useState<number>(0);
  const screenshotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('File selected:', file.name, 'Size:', file.size, 'bytes');
    setFileName(file.name);
    setIsLoading(true);

    try {
      console.log('Reading file...');
      const text = await file.text();
      console.log('File read complete, starting parsing...');

      const messagesByDate = parseWhatsAppChat(text);
      console.log('Parsing complete, generating heatmap data...');

      // Store the full message data
      setAllMessagesByDate(messagesByDate);

      // Get available years
      const years = getAvailableYears(messagesByDate);
      setAvailableYears(years);

      // Default to most recent year
      const defaultYear = years.length > 0 ? years[0] : new Date().getFullYear();
      setSelectedYear(defaultYear);

      // Generate heatmap for default year
      const data = generateHeatmapData(messagesByDate, defaultYear);
      console.log('Heatmap data generated:', data.length, 'days');
      setHeatmapData(data);

      // Calculate total messages
      const total = Array.from(messagesByDate.values()).reduce((a, b) => a + b, 0);
      setTotalMessages(total);
      console.log('Total messages:', total);

      console.log('✅ Processing complete!');
    } catch (error) {
      console.error('❌ Error processing file:', error);
      alert('Error processing file. Please check the console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    const data = generateHeatmapData(allMessagesByDate, year);
    setHeatmapData(data);
  };

  const handleScreenshotClick = () => {
    setTempChatName(chatName);
    setShowNameModal(true);
  };

  const handleScreenshotConfirm = async () => {
    if (!screenshotRef.current) return;

    // Update the chat name for the screenshot
    setChatName(tempChatName);
    setShowNameModal(false);
    setIsCapturing(true);

    try {
      // Wait for the UI to update with new name
      await new Promise(resolve => setTimeout(resolve, 200));

      const canvas = await html2canvas(screenshotRef.current, {
        backgroundColor: theme === 'dark' ? '#0d1117' : '#ffffff',
        scale: 2, // Higher quality
        logging: false,
        useCORS: true,
      });

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          const name = tempChatName || 'WhatsApp Chat';
          link.download = `${name}-${selectedYear}-heatmap.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
        }
        setIsCapturing(false);
      });
    } catch (error) {
      console.error('Screenshot failed:', error);
      alert('Failed to capture screenshot. Please try again.');
      setIsCapturing(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div>
            <h1>WhatsApp Chat Heatmap</h1>
            <p className="subtitle">Visualize your WhatsApp conversations over time</p>
          </div>
          <button
            className="theme-toggle"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <main className="main">
        {isLoading ? (
          <div className="upload-section">
            <div className="upload-card">
              <div className="loading-container">
                <div className="spinner"></div>
                <h2>Processing your chat...</h2>
                <p className="loading-text">This may take a moment for large files. Check the console for progress.</p>
              </div>
            </div>
          </div>
        ) : heatmapData.length === 0 ? (
          <div className="upload-section">
            <div className="upload-card">
              <h2>Upload Your Chat</h2>

              <label htmlFor="file-upload" className="file-upload-label">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>Choose a file</span>
                <input
                  id="file-upload"
                  type="file"
                  accept=".txt"
                  onChange={handleFileUpload}
                  className="file-input"
                />
              </label>

              <div className="instructions">
                <h3>How to export your WhatsApp chat:</h3>
                <ol>
                  <li>Open WhatsApp on your phone</li>
                  <li>Open the chat you want to visualize (works with both individual and group chats)</li>
                  <li>Tap the three dots (⋮) menu → <strong>More</strong> → <strong>Export chat</strong></li>
                  <li>Choose <strong>Without Media</strong></li>
                  <li>Download the ZIP file, extract it, and upload the <code>.txt</code> file here</li>
                </ol>
                <div className="privacy-note">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>100% private - All processing happens in your browser. No data is uploaded to any server.</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="visualization-section">
            <div className="controls">
              <div className="control-group">
                <label htmlFor="color-scheme">Color Scheme</label>
                <select
                  id="color-scheme"
                  value={selectedScheme.name}
                  onChange={(e) => {
                    const scheme = colorSchemes.find(s => s.name === e.target.value);
                    if (scheme) setSelectedScheme(scheme);
                  }}
                  className="color-select"
                >
                  {colorSchemes.map((scheme) => (
                    <option key={scheme.name} value={scheme.name}>
                      {scheme.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="button-group">
                <button
                  onClick={handleScreenshotClick}
                  disabled={isCapturing}
                  className="screenshot-button"
                >
                  {isCapturing ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spinning">
                        <circle cx="12" cy="12" r="10" opacity="0.25"/>
                        <path d="M12 2a10 10 0 0 1 10 10" />
                      </svg>
                      Capturing...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      Screenshot
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setHeatmapData([]);
                    setAllMessagesByDate(new Map());
                    setAvailableYears([]);
                    setSelectedYear(null);
                    setFileName('');
                    setChatName('');
                    setTotalMessages(0);
                  }}
                  className="reset-button"
                >
                  Upload New Chat
                </button>
              </div>
            </div>

            <div className="stats">
              <div className="stat-item">
                <span className="stat-label">File:</span>
                <span className="stat-value">{fileName}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Messages:</span>
                <span className="stat-value">{totalMessages.toLocaleString()}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Messages in {selectedYear}:</span>
                <span className="stat-value">
                  {heatmapData.reduce((sum, day) => sum + day.count, 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="heatmap-container-wrapper" ref={screenshotRef}>
              <div className="screenshot-header">
                <h2 className="screenshot-title">
                  {chatName || 'WhatsApp Chat'} - {selectedYear}
                </h2>
                <p className="screenshot-subtitle">
                  {heatmapData.reduce((sum, day) => sum + day.count, 0).toLocaleString()} messages in {selectedYear}
                </p>
              </div>

              <div className="year-tabs" style={{ display: isCapturing ? 'none' : 'flex' }}>
                {availableYears.map((year) => (
                  <button
                    key={year}
                    onClick={() => handleYearChange(year)}
                    className={`year-tab ${selectedYear === year ? 'active' : ''}`}
                  >
                    {year}
                  </button>
                ))}
              </div>

              <div className="heatmap-wrapper">
                <Heatmap data={heatmapData} colorScheme={selectedScheme} />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Screenshot Name Modal */}
      {showNameModal && (
        <div className="modal-overlay" onClick={() => setShowNameModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Name your screenshot</h3>
            <p className="modal-description">
              Enter the name of the person or group for this chat
            </p>
            <input
              type="text"
              value={tempChatName}
              onChange={(e) => setTempChatName(e.target.value)}
              placeholder="e.g. John Doe"
              className="modal-input"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleScreenshotConfirm();
                }
              }}
            />
            <div className="modal-actions">
              <button
                onClick={() => setShowNameModal(false)}
                className="modal-button modal-button-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleScreenshotConfirm}
                className="modal-button modal-button-primary"
              >
                Capture Screenshot
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        <p>Made with ❤️ by Chinmay Khamkar</p>
        <div className="social-links">
          <a
            href="https://github.com/chinmaykhamkar"
            target="_blank"
            rel="noopener noreferrer"
            className="social-link"
            aria-label="GitHub"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
          <a
            href="https://linkedin.com/in/chinmaykhamkar"
            target="_blank"
            rel="noopener noreferrer"
            className="social-link"
            aria-label="LinkedIn"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
            </svg>
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
