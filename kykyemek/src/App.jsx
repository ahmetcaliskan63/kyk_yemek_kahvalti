import PropTypes from 'prop-types';
import { useState, useEffect } from "react";
import { useSwipeable } from "react-swipeable";
import {
  ChevronLeft,
  ChevronRight,
  Coffee,
  Utensils,
  X
} from "lucide-react";
import "./MobileMealPlanner.css";
import { userTracker } from './firebase/userTracker';
//DayComponent Bileşeni
const DayComponent = ({ data, animationClass }) => (
  <div className={`day-component ${animationClass}`}>
    <h2 className="day-title">
      {data.gun}, {data.tarih}
    </h2>
    <div className="meal-section">
      <h3 className="meal-title breakfast">
        <Coffee className="meal-icon" /> Kahvaltı
      </h3>
      <p className="meal-text">{data.kahvalti.ana_urun}</p>
      <p className="meal-text">{data.kahvalti.ana_urun2}</p>
      <p className="meal-text">
        {Array.isArray(data.kahvalti.kahvaltilik)
          ? data.kahvalti.kahvaltilik.join(", ")
          : ""}
      </p>
      <p className="drink-text">{data.kahvalti.icecek}</p>
      <p className="meal-text">
        {data.kahvalti.ekmek}, {data.kahvalti.su}
      </p>
    </div>
    <div className="meal-section">
      <h3 className="meal-title dinner">
        <Utensils className="meal-icon" />
        Akşam Yemeği
      </h3>
      <p className="meal-text">{data.ogle_aksam.corba}</p>
      <p className="meal-text">{data.ogle_aksam.ana_yemek}</p>
      <p className="meal-text">{data.ogle_aksam.yardimci_yemek}</p>
      <p className="meal-text">{data.ogle_aksam.ek}</p>
      <p className="meal-text">
        {data.ogle_aksam.ekmek}, {data.ogle_aksam.su}
      </p>
    </div>
  </div>
);

DayComponent.propTypes = {
  data: PropTypes.shape({
    gun: PropTypes.string.isRequired,
    tarih: PropTypes.string.isRequired,
    kahvalti: PropTypes.shape({
      ana_urun: PropTypes.string.isRequired,
      ana_urun2: PropTypes.string.isRequired,
      kahvaltilik: PropTypes.arrayOf(PropTypes.string),
      icecek: PropTypes.string.isRequired,
      ekmek: PropTypes.string.isRequired,
      su: PropTypes.string.isRequired
    }).isRequired,
    ogle_aksam: PropTypes.shape({
      corba: PropTypes.string.isRequired,
      ana_yemek: PropTypes.string.isRequired,
      yardimci_yemek: PropTypes.string.isRequired,
      ek: PropTypes.string.isRequired,
      ekmek: PropTypes.string.isRequired,
      su: PropTypes.string.isRequired
    }).isRequired
  }).isRequired,
  animationClass: PropTypes.string.isRequired
};

export default function MobileMealPlanner() {
  const [mealPlan, setMealPlan] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startIndex, setStartIndex] = useState(0);
  const [animationClass, setAnimationClass] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // Tema ayarı için useEffect
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");
  }, []);

  // Verileri çekmek için useEffect
  useEffect(() => {
    fetch("/aralik.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error('Veri yüklenemedi');
        }
        return response.json();
      })
      .then((data) => {
        if (!data || !data.ocak_2025 || !Array.isArray(data.ocak_2025)) {
          throw new Error('Veri formatı geçersiz');
        }
        
        setMealPlan(data.ocak_2025);
        
        const today = new Date();
        const todayString = today.toLocaleDateString("tr-TR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });

        const todayIndex = data.ocak_2025.findIndex(
          (day) => day && day.tarih === todayString
        );

        const initialIndex = todayIndex >= 0 ? todayIndex : 0;
        setCurrentIndex(initialIndex);
        setStartIndex(initialIndex);
      })
      .catch((error) => {
        console.error("Yemek planı yüklenirken hata oluştu:", error);
        setMealPlan([]); // Boş array ile başlat
      });
  }, []);
  // Gezinme fonksiyonu
  const handleNavigation = (direction) => {
    setAnimationClass(
      direction === "next" ? "slide-out-left" : "slide-out-right"
    );
    setTimeout(() => {
      setCurrentIndex((prev) => {
        const newIndex = direction === "next" ? prev + 1 : prev - 1;
        const maxForward = Math.min(startIndex + 5, mealPlan.length - 1);
        const maxBackward = Math.max(startIndex - 5, 0);
        if (newIndex > maxForward) {
          setAlertMessage("En fazla 5 gün sonraki yemeği görebilirsiniz.");
          return prev;
        } else if (newIndex < maxBackward) {
          setAlertMessage("En fazla 5 gün önceki yemeği görebilirsiniz.");
          return prev;
        }
        setAlertMessage("");
        return newIndex;
      });
      setAnimationClass(
        direction === "next" ? "slide-in-right" : "slide-in-left"
      );
    }, 300);
  };
  const handlers = useSwipeable({
    onSwipedLeft: () => handleNavigation("next"),
    onSwipedRight: () => handleNavigation("prev"),
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
  });
  // Firebase işlemleri için useEffect
  useEffect(() => {
    const initializeFirebase = async () => {
      try {
        await userTracker.incrementActiveUsers();
        await userTracker.incrementTotalVisits();
      } catch (error) {
        console.error('Firebase işlemleri başlatılamadı:', error);
      }
    };

    initializeFirebase();

    return () => {
      userTracker.decrementActiveUsers().catch(error => {
        console.error('Aktif kullanıcı sayısı azaltılamadı:', error);
      });
    };
  }, []);

  // PWA yükleme önerisi için useEffect
  useEffect(() => {
    // Daha önce reddedilmiş mi kontrol et
    const isPromptDismissed = localStorage.getItem('installPromptDismissed') === 'true';
    
    // Eğer daha önce reddedilmemişse
    if (!isPromptDismissed) {
      const handler = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        
        // Kullanıcı mobil cihazda mı kontrol et
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        // Eğer mobil cihazda ise ve PWA zaten yüklü değilse
        if (isMobile && !window.matchMedia('(display-mode: standalone)').matches) {
          setShowInstallPrompt(true);
        }
      };

      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }
  }, []);

  // Ana ekrana ekleme işlevi
  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('Uygulama başarıyla kuruldu');
      } else {
        console.log('Kurulum reddedildi');
      }
    } catch (error) {
      console.error('Kurulum sırasında hata:', error);
    } finally {
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
      localStorage.setItem('installPromptDismissed', 'true');
    }
  };

  // Öneriyi kapatma işlevi
  const closeInstallPrompt = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('installPromptDismissed', 'true');
  };

  return (
    <div className="meal-planner">
      {showInstallPrompt && (
        <div className="install-prompt">
          <button className="close-prompt" onClick={closeInstallPrompt}>
            <X size={16} />
          </button>
          <div className="install-prompt-text">
            Daha hızlı erişim için uygulamayı ana ekranınıza ekleyin
          </div>
          <button className="install-button" onClick={handleInstall}>
            Ekle
          </button>
        </div>
      )}
      <div className="planner-container" {...handlers}>
        {Array.isArray(mealPlan) && mealPlan.length > 0 && currentIndex >= 0 && mealPlan[currentIndex] ? (
          <DayComponent
            data={mealPlan[currentIndex]}
            animationClass={animationClass}
          />
        ) : (
          <div className="error-message">
            <p>Yemek planı yüklenemedi. Lütfen daha sonra tekrar deneyiniz.</p>
          </div>
        )}
      </div>
      {alertMessage && (
        <div className="alert-message">
          <p>{alertMessage}</p>
        </div>
      )}
      <div className="navigation-buttons">
        <button
          className="nav-button"
          onClick={() => handleNavigation("prev")}
          disabled={currentIndex <= Math.max(startIndex - 5, 0)}
        >
          <ChevronLeft className="button-icon" />
          Önceki
        </button>
        <button
          className="nav-button"
          onClick={() => handleNavigation("next")}
          disabled={
            currentIndex >= Math.min(startIndex + 5, mealPlan.length - 1)
          }
        >
          Sonraki
          <ChevronRight className="button-icon" />
        </button>
      </div>
      <div className="developer-credit">
        Developed by{" "}
        <a href="https://www.linkedin.com/in/batuhanslkmm/" target="_blank" rel="noopener noreferrer">
          Batuhan Salkım
        </a>
        {" & "}
        <a href="https://www.linkedin.com/in/ahmetcaliskann/" target="_blank" rel="noopener noreferrer">
          Ahmet Çalışkan
        </a>
      </div>
    </div>
  );
}
