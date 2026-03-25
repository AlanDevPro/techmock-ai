'use client'

import React from 'react';

export const RotatingCube: React.FC = () => {
  return (
    <div className="relative w-80 h-80 mx-auto">
      <div className="terminal-container">
        {/* Terminal Window */}
        <div className="terminal-window">
          {/* Terminal Header */}
          <div className="terminal-header">
            <div className="terminal-controls">
              <div className="control-button red"></div>
              <div className="control-button yellow"></div>
              <div className="control-button green"></div>
            </div>
            <div className="terminal-title">dev_stream@architect:~/$</div>
          </div>

          {/* Terminal Content */}
          <div className="terminal-content">
            <div className="code-line">
              <span className="prompt">$</span>
              <span className="command">initiate_analysis</span>
              <span className="cursor">_</span>
            </div>
            <div className="code-line output">
              <span className="bullet">●</span> Scanning architecture...
            </div>
            <div className="code-line output">
              <span className="bullet">●</span> Analyzing dependencies...
            </div>
            <div className="code-line output success">
              <span className="bullet">✓</span> Code review complete
            </div>

            {/* Partículas que disparan */}
            <div className="particle particle-1"></div>
            <div className="particle particle-2"></div>
            <div className="particle particle-3"></div>
            <div className="particle particle-4"></div>
            <div className="particle particle-5"></div>
            <div className="particle particle-6"></div>
          </div>
        </div>

        {/* Efectos de disparo */}
        <div className="firing-effect firing-1"></div>
        <div className="firing-effect firing-2"></div>
        <div className="firing-effect firing-3"></div>
        <div className="firing-effect firing-4"></div>
      </div>

      <style jsx>{`
        .terminal-container {
          perspective: 1200px;
          width: 320px;
          height: 320px;
          position: relative;
        }

        .terminal-window {
          width: 100%;
          height: 250px;
          background: #1a1a1a;
          border: 2px solid #00ff00;
          border-radius: 8px;
          box-shadow: 0 0 30px #00ff00, 0 0 60px rgba(0, 255, 0, 0.3);
          animation: terminalFloat 4s ease-in-out infinite;
          position: relative;
          overflow: hidden;
        }

        .terminal-header {
          background: #2d2d2d;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 10px;
          border-bottom: 1px solid #444;
        }

        .terminal-controls {
          display: flex;
          gap: 6px;
        }

        .control-button {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .control-button.red { background: #ff5f56; }
        .control-button.yellow { background: #ffbd2e; }
        .control-button.green { background: #27ca3f; }

        .terminal-title {
          color: #00ff00;
          font-size: 11px;
          font-family: 'Courier New', monospace;
          font-weight: bold;
        }

        .terminal-content {
          padding: 15px;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          position: relative;
        }

        .code-line {
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          animation: typeLine 0.5s ease-out;
        }

        .code-line:nth-child(1) { animation-delay: 0s; }
        .code-line:nth-child(2) { animation-delay: 0.8s; }
        .code-line:nth-child(3) { animation-delay: 1.6s; }
        .code-line:nth-child(4) { animation-delay: 2.4s; }

        .prompt {
          color: #00ff00;
          margin-right: 8px;
          font-weight: bold;
        }

        .command {
          color: #ffffff;
        }

        .cursor {
          color: #00ff00;
          animation: blink 1s infinite;
        }

        .output {
          color: #aaa;
          margin-left: 16px;
        }

        .output.success {
          color: #00ff00;
        }

        .bullet {
          margin-right: 8px;
          color: #00ff00;
        }

        .particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: #00ff00;
          border-radius: 50%;
          box-shadow: 0 0 8px #00ff00;
        }

        .particle-1 {
          top: 20%;
          left: 80%;
          animation: fireParticle1 2s ease-out infinite;
        }

        .particle-2 {
          top: 40%;
          left: 85%;
          animation: fireParticle2 2.2s ease-out infinite 0.3s;
        }

        .particle-3 {
          top: 60%;
          left: 78%;
          animation: fireParticle3 2.1s ease-out infinite 0.6s;
        }

        .particle-4 {
          bottom: 30%;
          right: 80%;
          animation: fireParticle4 1.9s ease-out infinite 0.9s;
        }

        .particle-5 {
          bottom: 20%;
          right: 75%;
          animation: fireParticle5 2.3s ease-out infinite 1.2s;
        }

        .particle-6 {
          top: 30%;
          right: 85%;
          animation: fireParticle6 2s ease-out infinite 1.5s;
        }

        .firing-effect {
          position: absolute;
          width: 2px;
          height: 60px;
          background: linear-gradient(to bottom, #00ff00, transparent);
          box-shadow: 0 0 10px #00ff00;
        }

        .firing-1 {
          top: 10%;
          right: -10px;
          animation: fireLaser1 1.5s ease-out infinite;
        }

        .firing-2 {
          bottom: 20%;
          left: -10px;
          animation: fireLaser2 1.8s ease-out infinite 0.5s;
        }

        .firing-3 {
          top: 50%;
          right: -15px;
          animation: fireLaser3 1.6s ease-out infinite 1s;
        }

        .firing-4 {
          bottom: 40%;
          left: -15px;
          animation: fireLaser4 1.7s ease-out infinite 1.5s;
        }

        @keyframes terminalFloat {
          0%, 100% {
            transform: translateY(0px) rotateX(0deg) rotateY(0deg);
          }
          25% {
            transform: translateY(-10px) rotateX(5deg) rotateY(2deg);
          }
          50% {
            transform: translateY(-5px) rotateX(-2deg) rotateY(-3deg);
          }
          75% {
            transform: translateY(-15px) rotateX(3deg) rotateY(1deg);
          }
        }

        @keyframes typeLine {
          0% {
            opacity: 0;
            transform: translateX(-20px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes blink {
          0%, 50% {
            opacity: 1;
          }
          51%, 100% {
            opacity: 0;
          }
        }

        @keyframes fireParticle1 {
          0% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(80px, -60px) scale(0.3);
          }
        }

        @keyframes fireParticle2 {
          0% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(120px, -40px) scale(0.2);
          }
        }

        @keyframes fireParticle3 {
          0% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(100px, -80px) scale(0.4);
          }
        }

        @keyframes fireParticle4 {
          0% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-90px, -50px) scale(0.2);
          }
        }

        @keyframes fireParticle5 {
          0% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-110px, -70px) scale(0.3);
          }
        }

        @keyframes fireParticle6 {
          0% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-80px, -90px) scale(0.1);
          }
        }

        @keyframes fireLaser1 {
          0% {
            opacity: 0;
            transform: translateX(0) scaleY(0);
          }
          20% {
            opacity: 1;
            transform: translateX(0) scaleY(1);
          }
          80% {
            opacity: 1;
            transform: translateX(200px) scaleY(1);
          }
          100% {
            opacity: 0;
            transform: translateX(300px) scaleY(0.2);
          }
        }

        @keyframes fireLaser2 {
          0% {
            opacity: 0;
            transform: translateX(0) scaleY(0);
          }
          20% {
            opacity: 1;
            transform: translateX(0) scaleY(1);
          }
          80% {
            opacity: 1;
            transform: translateX(-200px) scaleY(1);
          }
          100% {
            opacity: 0;
            transform: translateX(-300px) scaleY(0.2);
          }
        }

        @keyframes fireLaser3 {
          0% {
            opacity: 0;
            transform: translateX(0) scaleY(0) rotate(45deg);
          }
          20% {
            opacity: 1;
            transform: translateX(0) scaleY(1) rotate(45deg);
          }
          80% {
            opacity: 1;
            transform: translateX(180px) scaleY(1) rotate(45deg);
          }
          100% {
            opacity: 0;
            transform: translateX(280px) scaleY(0.2) rotate(45deg);
          }
        }

        @keyframes fireLaser4 {
          0% {
            opacity: 0;
            transform: translateX(0) scaleY(0) rotate(-45deg);
          }
          20% {
            opacity: 1;
            transform: translateX(0) scaleY(1) rotate(-45deg);
          }
          80% {
            opacity: 1;
            transform: translateX(-180px) scaleY(1) rotate(-45deg);
          }
          100% {
            opacity: 0;
            transform: translateX(-280px) scaleY(0.2) rotate(-45deg);
          }
        }
      `}</style>
    </div>
  );
};