import os
import base64
import subprocess

# 1. Read base64 cropped logo
with open("public/branding/stone-tech-logo-cropped.png", "rb") as f:
    logo_b64 = "data:image/png;base64," + base64.b64encode(f.read()).decode("utf-8")

# 2. Template for 1080x1920 Vertical Story Flyer
story_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@500;600;700;800&display=swap');

* {{
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}}

body {{
  width: 1080px;
  height: 1920px;
  background: #090e17;
  color: #ffffff;
  font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 55px 54px;
}}

/* Ambient Luxury Glows */
.ambient-glow-top {{
  position: absolute;
  top: -150px;
  left: 50%;
  transform: translateX(-50%);
  width: 900px;
  height: 600px;
  background: radial-gradient(ellipse at center, rgba(13, 148, 136, 0.28) 0%, rgba(245, 158, 11, 0.12) 45%, transparent 70%);
  pointer-events: none;
}}

.ambient-glow-bottom {{
  position: absolute;
  bottom: -150px;
  left: 50%;
  transform: translateX(-50%);
  width: 900px;
  height: 500px;
  background: radial-gradient(ellipse at center, rgba(13, 148, 136, 0.22) 0%, transparent 70%);
  pointer-events: none;
}}

/* Decorative Borders */
.frame-border {{
  position: absolute;
  inset: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 36px;
  pointer-events: none;
}}

.accent-bar-top {{
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 10px;
  background: linear-gradient(90deg, #0d9488 0%, #14b8a6 50%, #f59e0b 100%);
}}

/* HEADER */
.header {{
  text-align: center;
  position: relative;
  z-index: 10;
}}

.logo-wrapper {{
  display: inline-block;
  padding: 16px 38px 14px 38px;
  background: #ffffff;
  border-radius: 30px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.5), 0 0 0 2px rgba(255, 255, 255, 0.2);
}}

.logo-img {{
  height: 220px;
  width: auto;
  max-width: 460px;
  object-fit: contain;
  display: block;
  margin: 0 auto;
}}

.hiring-badge {{
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 10px 28px;
  background: rgba(13, 148, 136, 0.18);
  border: 1.5px solid #14b8a6;
  border-radius: 50px;
  color: #2dd4bf;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-top: 22px;
}}

.hiring-badge svg {{
  width: 24px;
  height: 24px;
  fill: currentColor;
}}

.main-title {{
  font-family: 'Outfit', sans-serif;
  font-size: 54px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #ffffff;
  margin-top: 14px;
  line-height: 1.15;
}}

.main-title span {{
  background: linear-gradient(135deg, #2dd4bf 0%, #38bdf8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}}

.subtitle {{
  font-size: 23px;
  color: #94a3b8;
  margin-top: 8px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}}

/* JOB CARDS CONTAINER */
.cards-container {{
  display: flex;
  flex-direction: column;
  gap: 26px;
  position: relative;
  z-index: 10;
  margin: 20px 0;
}}

.job-card {{
  background: rgba(19, 28, 46, 0.85);
  border: 1.5px solid rgba(255, 255, 255, 0.12);
  border-radius: 28px;
  padding: 32px 38px;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(12px);
  position: relative;
  overflow: hidden;
}}

.job-card::before {{
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 6px;
  height: 100%;
  background: #0d9488;
}}

.job-card.gold::before {{
  background: #f59e0b;
}}

.card-top {{
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}}

.role-num-badge {{
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: #0d9488;
  color: #ffffff;
  font-size: 24px;
  font-weight: 800;
  flex-shrink: 0;
}}

.job-card.gold .role-num-badge {{
  background: #d97706;
}}

.role-info {{
  flex: 1;
}}

.role-title {{
  font-family: 'Outfit', sans-serif;
  font-size: 38px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -0.01em;
  line-height: 1.2;
}}

.role-dept {{
  font-size: 20px;
  color: #94a3b8;
  font-weight: 600;
  margin-top: 4px;
}}

.salary-badge {{
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
  border-radius: 14px;
  background: rgba(16, 185, 129, 0.15);
  border: 1.5px solid rgba(16, 185, 129, 0.4);
  color: #34d399;
  font-size: 26px;
  font-weight: 800;
  white-space: nowrap;
}}

.role-meta-strip {{
  display: flex;
  align-items: center;
  gap: 28px;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 22px;
  color: #cbd5e1;
}}

.meta-item {{
  display: flex;
  align-items: center;
  gap: 10px;
}}

.meta-item svg {{
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}}

.meta-item.loc svg {{ fill: #f43f5e; }}
.meta-item.time svg {{ fill: #38bdf8; }}

.card-details {{
  margin-top: 16px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 18px;
  padding: 18px 24px;
}}

.detail-row {{
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 21px;
  color: #e2e8f0;
  margin-bottom: 10px;
  line-height: 1.4;
}}

.detail-row:last-child {{
  margin-bottom: 0;
}}

.check-icon {{
  width: 22px;
  height: 22px;
  fill: #14b8a6;
  flex-shrink: 0;
  margin-top: 3px;
}}

.skills-row {{
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}}

.skill-pill {{
  font-size: 18px;
  font-weight: 600;
  color: #cbd5e1;
  background: rgba(255, 255, 255, 0.08);
  padding: 6px 16px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}}

.skill-pill.mandatory {{
  background: rgba(245, 158, 11, 0.18);
  color: #fbbf24;
  border-color: rgba(245, 158, 11, 0.4);
}}

/* FOOTER CALL TO ACTION */
.footer-cta {{
  position: relative;
  z-index: 10;
  background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
  border: 2px solid rgba(255, 255, 255, 0.25);
  border-radius: 28px;
  padding: 28px 40px;
  box-shadow: 0 20px 50px rgba(13, 148, 136, 0.4);
  display: flex;
  align-items: center;
  justify-content: space-between;
}}

.cta-left {{
  display: flex;
  flex-direction: column;
  gap: 6px;
}}

.cta-title {{
  font-family: 'Outfit', sans-serif;
  font-size: 34px;
  font-weight: 800;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 12px;
}}

.cta-url {{
  font-size: 26px;
  font-weight: 700;
  color: #ccfbf1;
  letter-spacing: 0.02em;
}}

.cta-right {{
  text-align: right;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}}

.whatsapp-box {{
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.2);
  padding: 10px 22px;
  border-radius: 16px;
  font-size: 24px;
  font-weight: 800;
  color: #ffffff;
}}

.whatsapp-box svg {{
  width: 28px;
  height: 28px;
  fill: #25D366;
}}

.loc-text {{
  font-size: 19px;
  color: #99f6e4;
  font-weight: 500;
}}

.atelier-brand {{
  text-align: center;
  margin-top: 12px;
  font-size: 19px;
  color: #64748b;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}}
</style>
</head>
<body>

<div class="accent-bar-top"></div>
<div class="ambient-glow-top"></div>
<div class="ambient-glow-bottom"></div>
<div class="frame-border"></div>

<!-- HEADER -->
<div class="header">
  <div class="logo-wrapper">
    <img src="{logo_b64}" class="logo-img" alt="STONE TECH">
  </div>
  
  <div>
    <div class="hiring-badge">
      <svg viewBox="0 0 24 24"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/></svg>
      <span>We Are Actively Hiring</span>
    </div>
  </div>

  <h1 class="main-title">Join Our Team at <span>Stone Tech</span></h1>
  <div class="subtitle">
    <svg style="width:20px;height:20px;fill:#f43f5e;" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
    <span>SG Business Hub, Vasant Nagar, Gota, Ahmedabad</span>
  </div>
</div>

<!-- JOB CARDS -->
<div class="cards-container">
  
  <!-- ROLE 1: DATA ENTRY EXECUTIVE -->
  <div class="job-card">
    <div class="card-top">
      <div style="display:flex;align-items:flex-start;gap:18px;">
        <div class="role-num-badge">1</div>
        <div class="role-info">
          <div class="role-title">Data Entry Executive</div>
          <div class="role-dept">ERP / CRM &amp; Business Operations</div>
        </div>
      </div>
      <div class="salary-badge">
        <span>₹12,000 – ₹15,000 / mo</span>
      </div>
    </div>

    <div class="role-meta-strip">
      <div class="meta-item loc">
        <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
        <span>Gota, Ahmedabad (In-Office)</span>
      </div>
      <div class="meta-item time">
        <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
        <span>10:00 AM – 7:30 PM (Mon–Sat)</span>
      </div>
    </div>

    <div class="card-details">
      <div class="detail-row">
        <svg class="check-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
        <div><strong>Primary KRA:</strong> Enter &amp; maintain real-time vendor, agency, customer and payroll data in our ERP &amp; CRM software.</div>
      </div>
      <div class="detail-row">
        <svg class="check-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
        <div><strong>Key Skills:</strong> Good English writing, AI tools (ChatGPT, etc.), Word/Excel/PDF editing, aware and soft-spoken.</div>
      </div>
    </div>

    <div class="skills-row">
      <span class="skill-pill">English Writing</span>
      <span class="skill-pill">ChatGPT / AI Tools</span>
      <span class="skill-pill">Excel &amp; Word Editing</span>
      <span class="skill-pill">PDF Editing</span>
      <span class="skill-pill">ERP Software</span>
      <span class="skill-pill">Soft Spoken</span>
    </div>
  </div>

  <!-- ROLE 2: FIELD SALES EXECUTIVE -->
  <div class="job-card gold">
    <div class="card-top">
      <div style="display:flex;align-items:flex-start;gap:18px;">
        <div class="role-num-badge">2</div>
        <div class="role-info">
          <div class="role-title">Field Sales Executive</div>
          <div class="role-dept">Architect &amp; Contractor Relations</div>
        </div>
      </div>
      <div class="salary-badge" style="background:rgba(245,158,11,0.15);border-color:rgba(245,158,11,0.4);color:#fbbf24;">
        <span>₹15k–₹18k + Fuel + Incentives</span>
      </div>
    </div>

    <div class="role-meta-strip">
      <div class="meta-item loc">
        <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
        <span>Base: Gota, Ahmedabad</span>
      </div>
      <div class="meta-item time">
        <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
        <span>10:00 AM – 7:30 PM (Mon–Sat)</span>
      </div>
    </div>

    <div class="card-details">
      <div class="detail-row">
        <svg class="check-icon" style="fill:#f59e0b;" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
        <div><strong>Primary KRA:</strong> Visit architectural offices, interior designers, PMCs &amp; construction sites to showcase stone products &amp; services.</div>
      </div>
      <div class="detail-row">
        <svg class="check-icon" style="fill:#f59e0b;" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
        <div><strong>Requirements:</strong> Personal Two-Wheeler &amp; License (Mandatory). Fluent in Gujarati, Hindi &amp; English.</div>
      </div>
    </div>

    <div class="skills-row">
      <span class="skill-pill mandatory">🛵 Two-Wheeler &amp; License</span>
      <span class="skill-pill">Gujarati Fluency</span>
      <span class="skill-pill">Hindi Fluency</span>
      <span class="skill-pill">English Speaking</span>
      <span class="skill-pill">Client Relations</span>
      <span class="skill-pill">Field Visits</span>
    </div>
  </div>

</div>

<!-- FOOTER CTA -->
<div class="footer-cta">
  <div class="cta-left">
    <div class="cta-title">
      <span>Apply Directly Online:</span>
    </div>
    <div class="cta-url">https://stonetech.in/careers</div>
    <div class="loc-text">Fast review &amp; interview scheduling within 24 hours</div>
  </div>

  <div class="cta-right">
    <div class="whatsapp-box">
      <svg viewBox="0 0 24 24"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z"/></svg>
      <span>+91 77420 90866</span>
    </div>
    <div style="font-size:18px;color:#ccfbf1;margin-top:4px;">HR WhatsApp Hiring Desk</div>
  </div>
</div>

<div class="atelier-brand">Stone Tech · Architectural Stone Atelier · Ahmedabad</div>

</body>
</html>
"""

with open("scripts/templates/hiring-story-flyer.html", "w") as f:
    f.write(story_html)

# 3. Template for 1200x630 OpenGraph Banner
og_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Outfit:wght@600;700;800&display=swap');

* {{ box-sizing: border-box; margin: 0; padding: 0; }}

body {{
  width: 1200px;
  height: 630px;
  background: #090e17;
  color: #ffffff;
  font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 40px 48px;
}}

.ambient-glow {{
  position: absolute;
  top: -100px;
  right: -100px;
  width: 700px;
  height: 700px;
  background: radial-gradient(circle, rgba(13, 148, 136, 0.22) 0%, transparent 65%);
  pointer-events: none;
}}

.border-line {{
  position: absolute;
  inset: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  pointer-events: none;
}}

.left-col {{
  width: 380px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border-radius: 24px;
  padding: 24px;
  height: 100%;
  box-shadow: 0 16px 40px rgba(0,0,0,0.45);
}}

.logo-img {{
  width: 280px;
  max-height: 280px;
  object-fit: contain;
  display: block;
  margin: 0 auto;
}}

.brand-label {{
  margin-top: 18px;
  font-family: 'Outfit', sans-serif;
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  text-align: center;
}}

.brand-sub {{
  font-size: 13px;
  color: #64748b;
  margin-top: 4px;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}}

.right-col {{
  flex: 1;
  padding-left: 44px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
}}

.pill {{
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 18px;
  background: rgba(13, 148, 136, 0.18);
  border: 1px solid #14b8a6;
  border-radius: 20px;
  color: #2dd4bf;
  font-size: 14px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}}

.h1-title {{
  font-family: 'Outfit', sans-serif;
  font-size: 44px;
  font-weight: 800;
  line-height: 1.15;
  margin-top: 10px;
}}

.h1-title span {{
  color: #2dd4bf;
}}

.job-strips {{
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 14px 0;
}}

.strip {{
  background: rgba(19, 28, 46, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}}

.strip-title {{
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
}}

.strip-desc {{
  font-size: 13px;
  color: #94a3b8;
  margin-top: 2px;
}}

.strip-salary {{
  font-size: 18px;
  font-weight: 800;
  color: #34d399;
  white-space: nowrap;
}}

.bottom-cta {{
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #0d9488;
  border-radius: 14px;
  padding: 12px 22px;
}}

.cta-link {{
  font-size: 17px;
  font-weight: 800;
  color: #ffffff;
}}

.cta-phone {{
  font-size: 15px;
  font-weight: 700;
  color: #ccfbf1;
}}
</style>
</head>
<body>

<div class="ambient-glow"></div>
<div class="border-line"></div>

<div class="left-col">
  <img src="{logo_b64}" class="logo-img" alt="STONE TECH">
  <div class="brand-label">STONE TECH</div>
  <div class="brand-sub">Architectural Stone Atelier</div>
</div>

<div class="right-col">
  <div>
    <div class="pill">We Are Actively Hiring · Gota, Ahmedabad</div>
    <div class="h1-title">Careers at <span>Stone Tech</span></div>
  </div>

  <div class="job-strips">
    <div class="strip">
      <div>
        <div class="strip-title">1. Data Entry Executive (ERP &amp; Operations)</div>
        <div class="strip-desc">Timings: 10:00 AM – 7:30 PM · English &amp; ChatGPT · Gota, Ahmedabad</div>
      </div>
      <div class="strip-salary">₹12k – ₹15k / mo</div>
    </div>

    <div class="strip">
      <div>
        <div class="strip-title">2. Field Sales Executive (Architects &amp; PMCs)</div>
        <div class="strip-desc">Own 2-Wheeler Mandatory · Gujarati/Hindi/English · Site Visits</div>
      </div>
      <div class="strip-salary">₹15k – ₹18k + Fuel + Inc.</div>
    </div>
  </div>

  <div class="bottom-cta">
    <div class="cta-link">👉 Apply Online: stonetech.in/careers</div>
    <div class="cta-phone">WhatsApp HR: +91 77420 90866</div>
  </div>
</div>

</body>
</html>
"""

with open("scripts/templates/careers-og-banner.html", "w") as f:
    f.write(og_html)

# 4. Render with Chrome Headless
chrome_bin = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

flyer_cmd = [
    chrome_bin,
    "--headless",
    "--disable-gpu",
    "--window-size=1080,1920",
    "--screenshot=public/branding/hiring-story-flyer.png",
    "file://" + os.path.abspath("scripts/templates/hiring-story-flyer.html")
]
subprocess.run(flyer_cmd, check=True)
print("Rendered 1080x1920 hiring flyer successfully!")

og_cmd = [
    chrome_bin,
    "--headless",
    "--disable-gpu",
    "--window-size=1200,630",
    "--screenshot=public/branding/careers-og-banner.png",
    "file://" + os.path.abspath("scripts/templates/careers-og-banner.html")
]
subprocess.run(og_cmd, check=True)
print("Rendered 1200x630 OpenGraph banner successfully!")
