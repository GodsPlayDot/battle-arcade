import React, { useEffect, useState } from 'react';
import { Projectile } from '../types';

interface ProjectileProps {
    projectile: Projectile;
    cellSizeRem: number;
}

const ProjectileComponent: React.FC<ProjectileProps> = ({ projectile, cellSizeRem }) => {
    const [position, setPosition] = useState({ 
        top: projectile.source.y * cellSizeRem, 
        left: projectile.source.x * cellSizeRem 
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            setPosition({
                top: projectile.target.y * cellSizeRem,
                left: projectile.target.x * cellSizeRem,
            });
        }, 50);

        return () => clearTimeout(timer);
    }, [projectile, cellSizeRem]);

    const distance = Math.sqrt(
        Math.pow(projectile.target.x - projectile.source.x, 2) + 
        Math.pow(projectile.target.y - projectile.source.y, 2)
    );
    
    const duration = Math.max(0.2, Math.min(0.5, distance * 0.05));

    const { source, target, skill } = projectile;
    const angle = Math.atan2(target.y - source.y, target.x - source.x) * (180 / Math.PI);
    const Icon = skill.icon;

    let rangeCategory = 'MID';
    if (skill.range <= 2) {
      rangeCategory = 'CLOSE';
    } else if (skill.range >= 6) {
      rangeCategory = 'LONG';
    }

    const renderProjectileVisual = () => {
        switch (rangeCategory) {
            case 'CLOSE':
                return (
                    <div className="w-8 h-8 relative flex items-center justify-center player-token-inner">
                        <svg viewBox="0 0 24 24" className="absolute w-full h-full text-gray-300 animate-spin-slow filter drop-shadow-lg">
                            <path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" fill="currentColor"/>
                        </svg>
                        <Icon className="w-4 h-4 text-yellow-300 relative" />
                    </div>
                );
            case 'LONG':
                return (
                    <div className="w-8 h-8 relative flex items-center justify-center player-token-inner" style={{ transform: `rotate(${angle + 45}deg) rotateX(-55deg)` }}>
                        <svg viewBox="0 0 24 24" className="w-full h-full text-cyan-300 filter drop-shadow-lg">
                            <path d="M2 12 L12 2 L12 7 L22 12 L12 17 L12 22 Z" fill="currentColor"/>
                        </svg>
                        <Icon className="w-4 h-4 text-black absolute" style={{ transform: `rotate(${-angle -45}deg)` }} />
                    </div>
                );
            case 'MID':
            default:
                return (
                    <div className="player-token-inner w-8 h-8 rounded-full bg-black/50 p-1 shadow-lg shadow-yellow-400/50">
                        <Icon className="w-full h-full text-yellow-300" />
                    </div>
                );
        }
    };

    return (
        <div
            className="absolute w-16 h-16 flex items-center justify-center pointer-events-none z-20"
            style={{
                top: `${position.top}rem`,
                left: `${position.left}rem`,
                transform: 'translateZ(15px)',
                transition: `all ${duration}s ease-out`,
            }}
        >
           {renderProjectileVisual()}
        </div>
    );
};

export default ProjectileComponent;