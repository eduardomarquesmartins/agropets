import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronLeft, ArrowRight } from 'lucide-react';
import { useBannerStore } from '../store/bannerStore';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import './Hero.css';

const Hero = () => {
  const banners = useBannerStore((state) => state.banners);
  
  // Filtra apenas banners ativos e ordena por posição
  const activeBanners = useMemo(() => 
    banners.filter(b => b.status === 'active').sort((a, b) => (a.position || 0) - (b.position || 0)),
    [banners]
  );

  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    if (activeBanners.length <= 1) return;
    setCurrentSlide((prev) => (prev + 1) % activeBanners.length);
  };

  const prevSlide = () => {
    if (activeBanners.length <= 1) return;
    setCurrentSlide((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
  };

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % activeBanners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [activeBanners.length]);

  if (activeBanners.length === 0) return null;

  return (
    <div className="hero-container">
      <div 
        className="hero-slider"
        style={{ 
          transform: `translateX(-${currentSlide * 100}%)`,
        }}
      >
        {activeBanners.map((banner) => (
          <div className="hero-slide" key={banner.id}>
            <div className="slide-image-wrapper">
              <img src={banner.img} alt={banner.title} className="slide-image" crossOrigin="anonymous" />
                <div className="slide-overlay">
                  <div className="container">
                    <div className="slide-content">
                      <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                      >
                        <h2>{banner.title}</h2>
                        <p>{banner.subtitle}</p>
                        {banner.link?.trim() && (
                          <Link to={banner.link.trim()} className="slide-btn">
                            {banner.buttonText || 'Ver Detalhes'} <ArrowRight size={18} />
                          </Link>
                        )}
                      </motion.div>
                    </div>
                  </div>
                </div>
            </div>
          </div>
        ))}
      </div>
      
      {activeBanners.length > 1 && (
        <>
          <button className="slider-ctrl prev" onClick={prevSlide}>
            <ChevronLeft size={32} />
          </button>
          <button className="slider-ctrl next" onClick={nextSlide}>
            <ChevronRight size={32} />
          </button>

          <div className="slider-dots">
            {activeBanners.map((_, idx) => (
              <button 
                key={idx} 
                className={`dot ${currentSlide === idx ? 'active' : ''}`}
                onClick={() => setCurrentSlide(idx)}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};



export default Hero;

