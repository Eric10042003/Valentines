// ===== Valentine PWA App =====

(function() {
  'use strict';

  // --- State ---
  let musicStarted = false;
  let isMuted = false;
  let envelopeOpened = false;
  let letterExpanded = false;
  let letterParagraphIndex = 0;
  let letterComplete = false;
  let messageLineIndex = 0;
  let noButtonTapCount = 0;
  let yesButtonScale = 1;
  let noButtonHandler = null;
  let stickerIndex = 0;

  // Heart tap state
  let heartTapCount = 0;
  const heartTapTotal = 10;
  let heartComplete = false;

  // Sticker images for No button
  const noButtonStickers = [
    'images/tolog.png',
    'images/galet.png',
    'images/dino.png',
    'images/zombie.png'
  ];

  // Event handler references for cleanup
  let envelopeTapHandler = null;
  let letterTapHandler = null;
  let documentClickHandler = null;
  let messageClickHandler = null;
  let messageTouchHandler = null;

  // --- DOM Elements ---
  const audio = document.getElementById('bgMusic');
  const musicToggle = document.getElementById('musicToggle');
  const floatingPhotos = document.getElementById('floatingPhotos');
  const stickersContainer = document.getElementById('stickersContainer');
  const yesSticker = document.getElementById('yesSticker');
  const petalCanvas = document.getElementById('petalCanvas');

  // Heart tap elements
  const heartTapWrapper = document.getElementById('heartTapWrapper');
  const heartFillRect = document.getElementById('heartFillRect');
  const heartPulseRing = document.getElementById('heartPulseRing');
  const heartProgressBar = document.getElementById('heartProgressBar');
  const tapCountEl = document.getElementById('tapCount');
  const tapTotalEl = document.getElementById('tapTotal');

  const screens = {
    boot: document.getElementById('screenBoot'),
    loveLetter: document.getElementById('screenLoveLetter'),
    message: document.getElementById('screenMessage'),
    invitation: document.getElementById('screenInvitation'),
    confirmation: document.getElementById('screenConfirmation')
  };

  const buttons = {
    yes: document.getElementById('btnYes'),
    no: document.getElementById('btnNo')
  };

  // Envelope elements
  const envelope = document.getElementById('envelope');
  const letterPaper = document.getElementById('letterPaper');
  const envelopeHint = document.getElementById('envelopeHint');
  const letterHint = document.getElementById('letterHint');

  // --- Utility Functions ---
  function vibrate(pattern = 10) {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function getRandomPosition(button, container) {
    const containerRect = container.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();

    const padding = 30;
    const maxX = containerRect.width - buttonRect.width - padding * 2;
    const maxY = containerRect.height - buttonRect.height - padding * 2;

    let newX = Math.random() * maxX + padding;
    let newY = Math.random() * maxY + padding;

    const currentX = buttonRect.left - containerRect.left;
    const currentY = buttonRect.top - containerRect.top;

    const minDistance = 120;
    const distance = Math.sqrt(Math.pow(newX - currentX, 2) + Math.pow(newY - currentY, 2));

    if (distance < minDistance) {
      newX = (newX + maxX / 2) % maxX + padding;
      newY = (newY + maxY / 2) % maxY + padding;
    }

    newX = Math.max(padding, Math.min(newX, containerRect.width - buttonRect.width - padding));
    newY = Math.max(padding, Math.min(newY, containerRect.height - buttonRect.height - padding));

    return { x: newX, y: newY };
  }

  // --- Sticker Functions ---
  function spawnSticker() {
    const sticker = document.createElement('div');
    sticker.className = 'sticker';

    const img = document.createElement('img');
    img.src = noButtonStickers[stickerIndex % noButtonStickers.length];
    img.alt = 'Sticker';
    sticker.appendChild(img);

    // Random position within safe bounds
    const padding = 60;
    const maxX = window.innerWidth - padding * 2;
    const maxY = window.innerHeight - padding * 2;
    const x = Math.random() * maxX + padding;
    const y = Math.random() * maxY + padding;

    // Random rotation between -20 and 20 degrees
    const rotation = (Math.random() - 0.5) * 40;

    sticker.style.left = `${x}px`;
    sticker.style.top = `${y}px`;
    sticker.style.setProperty('--sticker-rotation', `${rotation}deg`);

    stickersContainer.appendChild(sticker);
    stickerIndex++;
  }

  function clearStickers() {
    stickersContainer.innerHTML = '';
    stickerIndex = 0;
  }

  function showYesSticker() {
    if (yesSticker) {
      yesSticker.classList.add('visible');
    }
  }

  // --- Music Control ---
  function startMusic() {
    if (musicStarted) return;

    audio.load();

    const playPromise = audio.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          audio.volume = 0.3;
          musicStarted = true;
          musicToggle.classList.add('visible');
          console.log('Audio playback started successfully');
        })
        .catch(err => {
          console.log('Audio playback failed:', err.message);
          musicStarted = false;
        });
    }
  }

  function toggleMusic() {
    vibrate(5);

    if (isMuted) {
      audio.volume = 0.3;
      musicToggle.classList.remove('muted');
      isMuted = false;
    } else {
      audio.volume = 0;
      musicToggle.classList.add('muted');
      isMuted = true;
    }
  }

  musicToggle.addEventListener('click', toggleMusic);

  // --- Photo Management (6 photos) ---
  function showPhotos() {
    floatingPhotos.classList.add('visible');
    const photos = floatingPhotos.querySelectorAll('.photo-frame');
    photos.forEach((photo, index) => {
      setTimeout(() => {
        photo.classList.add('visible');
      }, index * 300);
    });
  }

  function hidePhotos() {
    floatingPhotos.classList.remove('visible');
    const photos = floatingPhotos.querySelectorAll('.photo-frame');
    photos.forEach(photo => photo.classList.remove('visible'));
  }

  // --- Screen Transitions ---
  function transitionTo(targetScreen, transitionType = 'slide-up') {
    const currentScreen = document.querySelector('.screen.active');

    if (currentScreen) {
      currentScreen.classList.add(`transition-${transitionType}-out`);
      currentScreen.classList.remove('active');

      setTimeout(() => {
        currentScreen.classList.remove(`transition-${transitionType}-out`);
      }, 600);
    }

    setTimeout(() => {
      targetScreen.classList.add('active', `transition-${transitionType}-in`);

      setTimeout(() => {
        targetScreen.classList.remove(`transition-${transitionType}-in`);
      }, 800);

      initScreen(targetScreen.id);
    }, 500);
  }

  // --- Screen Initializers ---
  function initScreen(screenId) {
    switch(screenId) {
      case 'screenBoot':
        initBootScreen();
        break;
      case 'screenLoveLetter':
        initLoveLetterScreen();
        break;
      case 'screenMessage':
        initMessageScreen();
        break;
      case 'screenInvitation':
        initInvitationScreen();
        break;
      case 'screenConfirmation':
        initConfirmationScreen();
        break;
    }
  }

  // Boot Screen - Heart Tap Interaction
  function initBootScreen() {
    heartTapCount = 0;
    heartComplete = false;

    // Set initial values
    if (tapTotalEl) tapTotalEl.textContent = heartTapTotal;
    if (tapCountEl) tapCountEl.textContent = '0';
    if (heartProgressBar) heartProgressBar.style.width = '0%';
    if (heartFillRect) heartFillRect.setAttribute('y', '90');

    // Add tap listener
    if (heartTapWrapper) {
      heartTapWrapper.addEventListener('click', handleHeartTap);
      heartTapWrapper.addEventListener('touchend', handleHeartTap);
    }
  }

  function handleHeartTap(e) {
    e.preventDefault();
    if (heartComplete) return;

    heartTapCount++;
    vibrate(15);

    // Update UI
    if (tapCountEl) tapCountEl.textContent = heartTapCount;

    // Calculate fill progress (0 to 90, where 90 is empty and 0 is full)
    const fillProgress = 90 - (heartTapCount / heartTapTotal) * 90;
    if (heartFillRect) heartFillRect.setAttribute('y', fillProgress.toString());

    // Update progress bar
    const progressPercent = (heartTapCount / heartTapTotal) * 100;
    if (heartProgressBar) heartProgressBar.style.width = `${progressPercent}%`;

    // Animate pulse ring
    if (heartPulseRing) {
      heartPulseRing.classList.remove('pulse');
      void heartPulseRing.offsetWidth; // Force reflow
      heartPulseRing.classList.add('pulse');
    }

    // Heartbeat animation
    heartTapWrapper.classList.remove('tapped');
    void heartTapWrapper.offsetWidth;
    heartTapWrapper.classList.add('tapped');
    heartTapWrapper.classList.add('filling');

    // Add sparkle effect
    addHeartSparkle();

    // Check if complete
    if (heartTapCount >= heartTapTotal) {
      heartComplete = true;
      completeHeartAnimation();
    }
  }

  function addHeartSparkle() {
    const sparklesGroup = document.getElementById('heartSparkles');
    if (!sparklesGroup) return;

    const sparkle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    const x = 20 + Math.random() * 60;
    const y = 20 + Math.random() * 50;

    sparkle.setAttribute('cx', x.toString());
    sparkle.setAttribute('cy', y.toString());
    sparkle.setAttribute('r', '2');
    sparkle.setAttribute('fill', '#fff');
    sparkle.style.opacity = '1';
    sparkle.style.transition = 'all 0.5s ease-out';

    sparklesGroup.appendChild(sparkle);

    // Animate and remove
    setTimeout(() => {
      sparkle.setAttribute('cy', (y - 15).toString());
      sparkle.style.opacity = '0';
    }, 50);

    setTimeout(() => {
      sparkle.remove();
    }, 600);
  }

  function completeHeartAnimation() {
    // Remove tap listeners
    if (heartTapWrapper) {
      heartTapWrapper.removeEventListener('click', handleHeartTap);
      heartTapWrapper.removeEventListener('touchend', handleHeartTap);
      heartTapWrapper.classList.add('complete');
    }

    // Start rose petal confetti
    startRosePetalConfetti();

    // Start music
    setTimeout(() => {
      startMusic();
    }, 300);

    // Transition to love letter screen
    const container = screens.boot.querySelector('.heart-tap-container');
    if (container) {
      container.classList.add('transitioning');
    }

    setTimeout(() => {
      transitionTo(screens.loveLetter, 'fade');
    }, 1200);
  }

  // Rose Petal Confetti Animation
  function startRosePetalConfetti() {
    if (!petalCanvas) return;

    const ctx = petalCanvas.getContext('2d');
    petalCanvas.width = window.innerWidth;
    petalCanvas.height = window.innerHeight;
    petalCanvas.classList.add('visible');

    const petals = [];
    const petalColors = ['#8b2942', '#c9a0a0', '#d4a5a5', '#9e3a50', '#d4627a', '#f5c6d0'];
    const petalCount = 60;

    class Petal {
      constructor() {
        this.reset();
        this.y = Math.random() * petalCanvas.height * 0.5;
      }

      reset() {
        this.x = Math.random() * petalCanvas.width;
        this.y = -30;
        this.size = Math.random() * 12 + 6;
        this.speedY = Math.random() * 2 + 1;
        this.speedX = Math.random() * 2 - 1;
        this.rotation = Math.random() * 360;
        this.rotationSpeed = Math.random() * 4 - 2;
        this.color = petalColors[Math.floor(Math.random() * petalColors.length)];
        this.wobble = Math.random() * Math.PI * 2;
        this.wobbleSpeed = Math.random() * 0.05 + 0.02;
      }

      update() {
        this.y += this.speedY;
        this.wobble += this.wobbleSpeed;
        this.x += this.speedX + Math.sin(this.wobble) * 0.5;
        this.rotation += this.rotationSpeed;

        if (this.y > petalCanvas.height + 30) {
          this.reset();
        }
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation * Math.PI / 180);
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = this.color;

        // Draw petal shape
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size * 0.5, this.size, 0, 0, Math.PI * 2);
        ctx.fill();

        // Add highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.ellipse(-this.size * 0.2, -this.size * 0.3, this.size * 0.15, this.size * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }

    for (let i = 0; i < petalCount; i++) {
      petals.push(new Petal());
    }

    let frameCount = 0;
    const maxFrames = 180; // 3 seconds at 60fps

    function animate() {
      ctx.clearRect(0, 0, petalCanvas.width, petalCanvas.height);

      petals.forEach(petal => {
        petal.update();
        petal.draw();
      });

      frameCount++;

      if (frameCount < maxFrames) {
        requestAnimationFrame(animate);
      } else {
        // Fade out
        petalCanvas.style.transition = 'opacity 0.5s ease';
        petalCanvas.style.opacity = '0';
        setTimeout(() => {
          ctx.clearRect(0, 0, petalCanvas.width, petalCanvas.height);
          petalCanvas.classList.remove('visible');
          petalCanvas.style.opacity = '';
        }, 500);
      }
    }

    animate();
  }

  // --- Love Letter Screen Cleanup ---
  function cleanupLoveLetterScreen() {
    if (envelopeTapHandler) {
      envelope.removeEventListener('click', envelopeTapHandler);
      envelope.removeEventListener('touchend', envelopeTapHandler);
    }
    if (letterTapHandler) {
      letterPaper.removeEventListener('click', letterTapHandler);
      letterPaper.removeEventListener('touchend', letterTapHandler);
    }
    if (documentClickHandler) {
      document.removeEventListener('click', documentClickHandler);
      document.removeEventListener('touchend', documentClickHandler);
    }
  }

  // Love Letter Screen - Envelope interaction
  function initLoveLetterScreen() {
    // Clean up any existing listeners first
    cleanupLoveLetterScreen();

    // Reset state
    envelopeOpened = false;
    letterExpanded = false;
    letterParagraphIndex = 0;
    letterComplete = false;

    // Reset UI
    envelope.classList.remove('opened');
    letterPaper.classList.remove('expanded');
    envelopeHint.classList.remove('hidden', 'visible');
    letterHint.classList.remove('visible');

    const paragraphs = letterPaper.querySelectorAll('.letter-paragraph');
    paragraphs.forEach(p => p.classList.remove('visible'));

    // Show envelope hint after a delay
    setTimeout(() => {
      envelopeHint.classList.add('visible');
    }, 500);

    // Show 6 photos in background
    setTimeout(showPhotos, 800);

    // Reveal next paragraph helper
    function revealNextParagraph() {
      if (letterParagraphIndex < paragraphs.length) {
        paragraphs[letterParagraphIndex].classList.add('visible');
        letterParagraphIndex++;
        return true;
      }
      return false;
    }

    // Transition to message screen
    function goToMessageScreen() {
      if (letterComplete) return;
      letterComplete = true;

      letterHint.classList.remove('visible');
      hidePhotos();
      cleanupLoveLetterScreen();

      setTimeout(() => {
        transitionTo(screens.message, 'fade');
      }, 400);
    }

    // Handle envelope tap - opens the envelope
    envelopeTapHandler = function(e) {
      e.preventDefault();
      e.stopPropagation();

      if (envelopeOpened) return;

      vibrate(20);
      envelope.classList.add('opened');
      envelopeHint.classList.add('hidden');
      envelopeOpened = true;

      // After flap animation, expand the letter
      setTimeout(() => {
        letterPaper.classList.add('expanded');
        letterExpanded = true;

        // Reveal first paragraph
        setTimeout(() => {
          revealNextParagraph();
          letterHint.classList.add('visible');
        }, 600);
      }, 800);
    };

    // Handle letter/screen tap - reveals paragraphs or transitions
    letterTapHandler = function(e) {
      e.preventDefault();
      e.stopPropagation();

      if (!letterExpanded || letterComplete) return;

      vibrate(8);

      if (letterParagraphIndex < paragraphs.length) {
        revealNextParagraph();
      } else {
        goToMessageScreen();
      }
    };

    // Document click handler for tapping anywhere after letter is expanded
    documentClickHandler = function(e) {
      if (!letterExpanded || letterComplete) return;
      if (envelope.contains(e.target)) return;

      vibrate(8);

      if (letterParagraphIndex < paragraphs.length) {
        revealNextParagraph();
      } else {
        goToMessageScreen();
      }
    };

    // Add event listeners
    envelope.addEventListener('click', envelopeTapHandler);
    envelope.addEventListener('touchend', envelopeTapHandler);
    letterPaper.addEventListener('click', letterTapHandler);
    letterPaper.addEventListener('touchend', letterTapHandler);

    // Delay adding document listener to avoid immediate trigger
    setTimeout(() => {
      document.addEventListener('click', documentClickHandler);
      document.addEventListener('touchend', documentClickHandler);
    }, 1500);
  }

  // --- Message Screen Cleanup ---
  function cleanupMessageScreen() {
    const container = screens.message.querySelector('.message-container');
    if (messageClickHandler) {
      container.removeEventListener('click', messageClickHandler);
    }
    if (messageTouchHandler) {
      container.removeEventListener('touchend', messageTouchHandler);
    }
  }

  // Message Screen - Tap to reveal lines then continue
  async function initMessageScreen() {
    cleanupMessageScreen();

    messageLineIndex = 0;
    const lines = screens.message.querySelectorAll('.message-line');
    const hint = document.getElementById('messageHint');
    const container = screens.message.querySelector('.message-container');
    let messageComplete = false;

    // Reset
    lines.forEach(line => line.classList.remove('visible'));
    hint.classList.remove('visible', 'hidden');

    // Show first line after delay
    await delay(600);
    if (lines[0]) {
      lines[0].classList.add('visible');
      messageLineIndex = 1;
    }

    await delay(400);
    hint.classList.add('visible');

    function goToInvitationScreen() {
      if (messageComplete) return;
      messageComplete = true;

      cleanupMessageScreen();
      hint.classList.add('hidden');
      transitionTo(screens.invitation, 'scale');
    }

    messageClickHandler = function(e) {
      e.preventDefault();
      if (messageComplete) return;

      vibrate(8);

      if (messageLineIndex < lines.length) {
        lines[messageLineIndex].classList.add('visible');
        messageLineIndex++;
      } else {
        goToInvitationScreen();
      }
    };

    messageTouchHandler = function(e) {
      e.preventDefault();
      if (messageComplete) return;

      vibrate(8);

      if (messageLineIndex < lines.length) {
        lines[messageLineIndex].classList.add('visible');
        messageLineIndex++;
      } else {
        goToInvitationScreen();
      }
    };

    container.addEventListener('click', messageClickHandler);
    container.addEventListener('touchend', messageTouchHandler);
  }

  // Invitation Screen
  async function initInvitationScreen() {
    noButtonTapCount = 0;
    yesButtonScale = 1;

    // Clear any previous stickers
    clearStickers();

    const title = screens.invitation.querySelector('.invitation-title');
    const yesBtn = buttons.yes;
    const noBtn = buttons.no;

    // Reset button states
    title.classList.remove('visible');
    yesBtn.classList.remove('visible', 'growing', 'fullscreen');
    noBtn.classList.remove('visible', 'floating', 'escaping');
    yesBtn.style.cssText = '';
    noBtn.style.cssText = '';
    noBtn.style.display = '';
    noBtn.style.opacity = '';
    noBtn.style.pointerEvents = '';

    // Remove old event listeners
    if (noButtonHandler) {
      noBtn.removeEventListener('click', noButtonHandler);
      noBtn.removeEventListener('touchstart', noButtonHandler);
    }

    await delay(400);
    title.classList.add('visible');

    await delay(600);
    yesBtn.classList.add('visible');

    await delay(200);
    noBtn.classList.add('visible');

    setupNoButtonEscape();
  }

  function setupNoButtonEscape() {
    const noBtn = buttons.no;
    const yesBtn = buttons.yes;
    const screen = screens.invitation;

    noButtonHandler = function(e) {
      e.preventDefault();
      e.stopPropagation();

      vibrate([15, 30, 15]);
      noButtonTapCount++;

      // Spawn a sticker each time No is clicked
      spawnSticker();

      // Make the No button float and escape immediately
      if (!noBtn.classList.contains('floating')) {
        const rect = noBtn.getBoundingClientRect();
        noBtn.style.left = rect.left + 'px';
        noBtn.style.top = rect.top + 'px';
        noBtn.classList.add('floating');
      }

      // Add wobble animation
      noBtn.classList.add('escaping');
      setTimeout(() => noBtn.classList.remove('escaping'), 400);

      // Move No button to random position (away from center where Yes button is)
      const newPos = getRandomPositionAvoidCenter(noBtn, screen);
      noBtn.style.left = newPos.x + 'px';
      noBtn.style.top = newPos.y + 'px';

      // Shrink No button
      const noScale = Math.max(0.4, 1 - noButtonTapCount * 0.1);
      noBtn.style.transform = `scale(${noScale})`;

      // Grow Yes button progressively - stays in center of its container
      yesBtn.classList.add('growing');
      setTimeout(() => yesBtn.classList.remove('growing'), 500);

      // Phase 1: Grow in place (taps 1-5)
      if (noButtonTapCount <= 5) {
        const padding = 1 + noButtonTapCount * 0.25;
        const fontSize = 1 + noButtonTapCount * 0.08;
        yesBtn.style.padding = `${padding}rem ${padding * 1.8}rem`;
        yesBtn.style.fontSize = `${fontSize}rem`;
      }
      // Phase 2: Start expanding to fill screen (taps 6-9)
      else if (noButtonTapCount < 9) {
        const progress = (noButtonTapCount - 5) / 4;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Calculate size based on progress
        const maxWidth = Math.min(400, viewportWidth * 0.8);
        const width = 180 + (maxWidth - 180) * progress;
        const height = 60 + 40 * progress;

        yesBtn.style.padding = '0';
        yesBtn.style.width = `${width}px`;
        yesBtn.style.height = `${height}px`;
        yesBtn.style.fontSize = `${1.3 + progress * 0.3}rem`;
      }
      // Phase 3: Go fullscreen (tap 9+)
      else {
        noBtn.style.opacity = '0';
        noBtn.style.pointerEvents = 'none';

        setTimeout(() => {
          yesBtn.classList.add('fullscreen');
          noBtn.style.display = 'none';
        }, 300);
      }
    };

    noBtn.addEventListener('click', noButtonHandler);
    noBtn.addEventListener('touchstart', noButtonHandler, { passive: false });
  }

  // Get random position that avoids the center of the screen
  function getRandomPositionAvoidCenter(button, container) {
    const containerRect = container.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();

    const padding = 40;
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;
    const avoidRadius = 180; // Avoid this radius around center

    let newX, newY;
    let attempts = 0;
    const maxAttempts = 20;

    do {
      // Generate random position
      newX = Math.random() * (containerRect.width - buttonRect.width - padding * 2) + padding;
      newY = Math.random() * (containerRect.height - buttonRect.height - padding * 2) + padding;

      // Calculate distance from center
      const distFromCenter = Math.sqrt(
        Math.pow(newX + buttonRect.width / 2 - centerX, 2) +
        Math.pow(newY + buttonRect.height / 2 - centerY, 2)
      );

      attempts++;

      // Accept if far enough from center or max attempts reached
      if (distFromCenter > avoidRadius || attempts >= maxAttempts) {
        break;
      }
    } while (true);

    // Clamp to container bounds
    newX = Math.max(padding, Math.min(newX, containerRect.width - buttonRect.width - padding));
    newY = Math.max(padding, Math.min(newY, containerRect.height - buttonRect.height - padding));

    return { x: newX, y: newY };
  }

  // Confirmation Screen
  function initConfirmationScreen() {
    // Clear stickers from invitation screen
    clearStickers();

    // Show yes sticker with bounce animation
    setTimeout(showYesSticker, 400);

    // Start confetti
    setTimeout(startConfetti, 500);

    // Animate decorative elements
    const decorElements = screens.confirmation.querySelectorAll('.decor-element');
    decorElements.forEach((el, index) => {
      el.style.opacity = '0';
      setTimeout(() => {
        el.style.opacity = '';
      }, 600 + index * 200);
    });

    // Animate corner decorations
    const cornerDecors = screens.confirmation.querySelectorAll('.confirmation-decor');
    cornerDecors.forEach((decor, index) => {
      decor.style.animationDelay = `${0.3 + index * 0.1}s`;
    });
  }

  // --- Continuous Rose Petal Animation ---
  let confettiAnimationId = null;

  function startConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const petals = [];
    const petalColors = ['#6b1c2a', '#8b2942', '#c9a0a0', '#d4a5a5', '#9e3a50', '#d4627a', '#f5c6d0'];
    const petalCount = 50;

    class RosePetal {
      constructor(startFromTop = false) {
        this.reset(startFromTop);
      }

      reset(startFromTop = true) {
        this.x = Math.random() * canvas.width;
        this.y = startFromTop ? -30 : Math.random() * canvas.height;
        this.size = Math.random() * 14 + 8;
        this.speedY = Math.random() * 1.5 + 0.5;
        this.speedX = Math.random() * 1 - 0.5;
        this.rotation = Math.random() * 360;
        this.rotationSpeed = Math.random() * 2 - 1;
        this.color = petalColors[Math.floor(Math.random() * petalColors.length)];
        this.wobble = Math.random() * Math.PI * 2;
        this.wobbleSpeed = Math.random() * 0.03 + 0.01;
        this.opacity = Math.random() * 0.4 + 0.5;
      }

      update() {
        this.y += this.speedY;
        this.wobble += this.wobbleSpeed;
        this.x += this.speedX + Math.sin(this.wobble) * 0.8;
        this.rotation += this.rotationSpeed;

        if (this.y > canvas.height + 30) {
          this.reset(true);
        }
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation * Math.PI / 180);
        ctx.globalAlpha = this.opacity;

        // Draw petal shape
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size * 0.4, this.size, 0, 0, Math.PI * 2);
        ctx.fill();

        // Add highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.beginPath();
        ctx.ellipse(-this.size * 0.15, -this.size * 0.4, this.size * 0.12, this.size * 0.25, -0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }

    for (let i = 0; i < petalCount; i++) {
      petals.push(new RosePetal(false));
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      petals.forEach(petal => {
        petal.update();
        petal.draw();
      });

      confettiAnimationId = requestAnimationFrame(animate);
    }

    animate();

    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });
  }

  // --- Button Event Handlers ---
  buttons.yes.addEventListener('click', () => {
    vibrate([20, 50, 20, 50, 20]);
    transitionTo(screens.confirmation, 'scale');
  });

  // --- Preload Audio ---
  function preloadAudio() {
    audio.load();
    audio.volume = 0;

    audio.addEventListener('canplaythrough', () => {
      console.log('Audio ready to play');
    });

    audio.addEventListener('error', (e) => {
      console.log('Audio error:', e.target.error?.message || 'Unknown error');
    });
  }

  // --- Initialize ---
  document.addEventListener('DOMContentLoaded', () => {
    preloadAudio();
    initScreen('screenBoot');
  });

  // --- Service Worker Registration ---
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('SW registered:', reg.scope))
        .catch(err => console.log('SW registration failed:', err));
    });
  }

})();
