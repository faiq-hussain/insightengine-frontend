import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';

const NAV = [
  { path: '/', label: 'Dashboard', icon: '⬛' },
  { path: '/create', label: 'New Survey', icon: '✦' },
];

export default function Layout() {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 240,
        background: 'var(--bg2)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 10
      }}>
        {/* Logo */}
        <div style={{ padding: '8px 12px 28px' }}>
          <div style={{
            fontFamily: 'Syne',
            fontSize: 20,
            fontWeight: 800,
            color: 'var(--text)',
            letterSpacing: '-0.5px'
          }}>
            <span style={{ color: 'var(--accent)' }}>Insight</span>AI
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
            Conversational Research Engine
          </div>
        </div>

        <nav style={{ flex: 1 }}>
          {NAV.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 10,
                marginBottom: 4,
                fontSize: 14,
                fontWeight: 500,
                color: isActive ? 'var(--text)' : 'var(--text2)',
                background: isActive ? 'var(--bg3)' : 'transparent',
                border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                textDecoration: 'none',
                transition: 'all 0.2s'
              })}
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{
          padding: '12px 14px',
          background: 'rgba(79,110,247,0.06)',
          borderRadius: 10,
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Status</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
            AI Engine Active
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ marginLeft: 240, flex: 1, padding: '32px 40px', maxWidth: 'calc(100vw - 240px)' }}>
        <Outlet />
      </main>
    </div>
  );
}
