import React from 'react';
import logo from '../img/logo_uni.png';

function Footer() {
  return (
    <footer className="bg-light text-center text-muted py-3 mt-auto border-top">
      <div className="container">
        <small>&copy; {new Date().getFullYear()} CHeCLOUD. CC BY-SA 4.0</small><br/>
        <small>Antonio Lieto, Maria Angela Pellegrino and Gabriele Tuozzo</small>
        <div className="footer-image" style={{ marginTop: "10px" }}>
          <img
            src={logo} 
            alt="UNISA logo"
            style={{ width: "150px", height: "auto" }} // Adjust size as needed
          />
        </div>
      </div>
    </footer>
  );
}

export default Footer;