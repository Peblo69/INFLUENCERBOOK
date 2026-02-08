import React from 'react';
import { Link } from 'react-router-dom';

export const InstallExtensionPage = () => {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px',
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 24px',
            background: 'white',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
          }}>
            <svg width="50" height="50" viewBox="0 0 24 24" fill="none">
              <path d="M12 7L15 10L12 13L9 10L12 7Z" fill="#8B5CF6"/>
              <path d="M12 11L15 14L12 17L9 14L12 11Z" fill="#8B5CF6" opacity="0.7"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '48px', fontWeight: '800', marginBottom: '16px', textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}>
            Kiara Vision Extension
          </h1>
          <p style={{ fontSize: '20px', opacity: 0.95, fontWeight: '500' }}>
            Generate AI images from anywhere on the web
          </p>
        </div>

        {/* Download Section */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: '48px',
          marginBottom: '40px',
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ fontSize: '28px', marginBottom: '16px' }}>Ready to transform the web?</h2>
          <p style={{ marginBottom: '32px', fontSize: '18px', opacity: 0.9 }}>
            Hover over any image on Pinterest, Instagram, or Google to generate with Kiara Vision AI
          </p>
          <a
            href="/kiara-vision-extension.zip"
            download
            style={{
              background: 'white',
              color: '#764ba2',
              border: 'none',
              padding: '20px 48px',
              fontSize: '20px',
              fontWeight: '700',
              borderRadius: '16px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
              textDecoration: 'none'
            }}
          >
            <span style={{ fontSize: '24px' }}>⬇️</span>
            Download Extension
          </a>
          <p style={{ marginTop: '24px', opacity: 0.8, fontSize: '14px' }}>
            Free • Works with Chrome, Edge, Brave, and other Chromium browsers
          </p>
        </div>

        {/* Installation Steps */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: '40px',
          border: '1px solid rgba(255, 255, 255, 0.15)'
        }}>
          <h2 style={{ fontSize: '32px', marginBottom: '32px', textAlign: 'center' }}>Installation Guide</h2>

          {[
            { num: 1, title: 'Download the Extension', desc: 'Click the download button above. A file named "kiara-vision-extension.zip" will be saved to your Downloads folder.' },
            { num: 2, title: 'Open Chrome Extensions', desc: 'Open Chrome (or Edge/Brave) and type chrome://extensions in the address bar. Press Enter.' },
            { num: 3, title: 'Enable Developer Mode', desc: 'Look for the "Developer mode" toggle in the top-right corner and turn it ON.' },
            { num: 4, title: 'Drag & Drop the ZIP File', desc: 'Drag the "kiara-vision-extension.zip" file from your Downloads folder directly onto the extensions page. Chrome will automatically install it!' },
            { num: 5, title: 'Start Using It!', desc: 'Go to Pinterest.com, Instagram, or any website. Hover over an image and see the purple Kiara logo appear. Click it to generate with AI! ✨' }
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: '24px', marginBottom: i === 4 ? 0 : '32px', alignItems: 'flex-start' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: '700',
                flexShrink: 0
              }}>
                {step.num}
              </div>
              <div>
                <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>{step.title}</h3>
                <p style={{ opacity: 0.9, lineHeight: '1.6', fontSize: '16px' }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Features */}
        <div style={{
          marginTop: '40px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px'
        }}>
          {[
            { icon: '✨', title: 'Generate Anywhere', desc: 'Works on Pinterest, Instagram, Google Images, and any website with images.' },
            { icon: '🎯', title: 'Quick Actions', desc: 'Generate, use as reference, or analyze images with one click.' },
            { icon: '🚀', title: 'Super Fast', desc: 'Lightweight extension that doesn\'t slow down your browser.' }
          ].map((feature, i) => (
            <div key={i} style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid rgba(255, 255, 255, 0.15)'
            }}>
              <h3 style={{ fontSize: '18px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>{feature.icon}</span> {feature.title}
              </h3>
              <p style={{ opacity: 0.9, fontSize: '14px', lineHeight: '1.5' }}>{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '60px', opacity: 0.8 }}>
          <p>Need help? <Link to="/" style={{ color: 'white', textDecoration: 'underline' }}>Visit Kiara Studio</Link></p>
          <p style={{ marginTop: '12px', fontSize: '14px' }}>Made with 💜 by Kiara Studio Labs</p>
        </div>
      </div>
    </div>
  );
};
