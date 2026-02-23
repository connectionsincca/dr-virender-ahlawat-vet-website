	 // Function to check if an element is in the viewport
	function isInViewport(element) {
	  const rect = element.getBoundingClientRect();
	  return (
		rect.top <= window.innerHeight && 
		rect.bottom >= 0
	  );
	}

	// Add body scroll lock
	const bodyScrollLock = {
	  enable() {
		document.body.style.overflow = 'hidden';
	  },
	  disable() {
		document.body.style.overflow = '';
	  }
	};

	document.querySelector('.hamburger').addEventListener('click', bodyScrollLock.enable);
	document.querySelector('.nav-wrapper').addEventListener('click', bodyScrollLock.disable);
	
	// Video Carousel Functionality
	document.addEventListener('DOMContentLoaded', function() {
	  const videoItems = document.querySelectorAll('.video-carousel .video-item');
	  const totalVideos = videoItems.length;
	  let currentVideoIndex = 0;
	  
	  // Initialize the carousel
	  function initVideoCarousel() {
		updateVideoPositions();
		
		// Add event listeners for navigation
		document.querySelector('.prev-video').addEventListener('click', () => {
		  navigateVideo(-1);
		});
		
		document.querySelector('.next-video').addEventListener('click', () => {
		  navigateVideo(1);
		});
		
		// Add click event for the active video
		document.addEventListener('click', (e) => {
		  const playButton = e.target.closest('.video-item.active .play-button');
		  if (playButton) {
			const videoId = videoItems[currentVideoIndex].dataset.videoId;
			playVideoInline(videoId);
		  }
		  
		  if (e.target.closest('.close-video-player')) {
			closeVideoPlayer();
		  }
		});
		
		// Keyboard navigation
		document.addEventListener('keydown', (e) => {
		  if (e.key === 'ArrowLeft') {
			navigateVideo(-1);
		  } else if (e.key === 'ArrowRight') {
			navigateVideo(1);
		  } else if (e.key === 'Escape') {
			closeVideoPlayer();
		  }
		});
	  }
	  
	  // Update positions of all videos
	  function updateVideoPositions() {
		videoItems.forEach((item, index) => {
		  // Remove all classes first
		  item.classList.remove('active', 'prev', 'next', 'prev-hidden', 'next-hidden');
		  
		  // Calculate position relative to current
		  const position = (index - currentVideoIndex + totalVideos) % totalVideos;
		  
		  if (position === 0) {
			item.classList.add('active');
		  } else if (position === 1 || position === (totalVideos - 1)) {
			item.classList.add(position === 1 ? 'next' : 'prev');
		  } else if (position === 2 || position === (totalVideos - 2)) {
			item.classList.add(position === 2 ? 'next-hidden' : 'prev-hidden');
		  } else {
			item.style.opacity = '0';
		  }
		});
	  }
	  
	  // Navigate to previous or next video
	  function navigateVideo(direction) {
		currentVideoIndex = (currentVideoIndex + direction + totalVideos) % totalVideos;
		updateVideoPositions();
	  }
	  
	  // Play video inline - updated to hide menubar
	  function playVideoInline(videoId) {
		const playerContainer = document.querySelector('.video-player-container');
		const player = document.getElementById('video-player');
		const menubar = document.querySelector('header'); // Select the menubar/header
		
		// Create iframe
		player.innerHTML = `
		  <iframe 
			width="100%" 
			height="100%" 
			src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
			frameborder="0" 
			allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" 
			allowfullscreen>
		  </iframe>
		`;
		
		// Show player and hide menubar
		playerContainer.style.display = 'flex';
		if (menubar) menubar.classList.add('hidden-during-video');
	  }
	  
	  // Close video player - updated to show menubar again
	  function closeVideoPlayer() {
		const playerContainer = document.querySelector('.video-player-container');
		const player = document.getElementById('video-player');
		const menubar = document.querySelector('header'); // Select the menubar/header
		
		player.innerHTML = '';
		playerContainer.style.display = 'none';
		if (menubar) menubar.classList.remove('hidden-during-video');
	  }
	  
	  // Initialize on load
	  initVideoCarousel();
	});

	// Function to handle scroll events
	function handleScroll() {
	  /*const animatedElements = document.querySelectorAll('[data-animation]');
	  animatedElements.forEach((element) => {
		if (isInViewport(element)) {
		  const animationType = element.getAttribute('data-animation');
		  element.classList.add(animationType);
		  element.style.opacity = 1; // Make the element visible
		}
	  });*/
	  const observer = new IntersectionObserver((entries) => {
		entries.forEach(entry => {
		  if (entry.isIntersecting) {
			const animationType = entry.target.getAttribute('data-animation');
			entry.target.classList.add(animationType);
			entry.target.style.opacity = 1;
		  }
		});
	  }, { threshold: 0.5 }); // Trigger when 50% of the element is visible

	  document.querySelectorAll('[data-animation]').forEach((element) => {
		observer.observe(element);
	  });
	}

	// Function to animate numbers
	function animateNumbers() {
	  const metricCards = document.querySelectorAll('.metric-card h2');
	  metricCards.forEach((card) => {
		const target = +card.innerText.replace('+', '');
		const duration = 1000;
		let startTime = null;

		const updateNumber = (timestamp) => {
		  if (!startTime) startTime = timestamp;
		  const progress = timestamp - startTime;
		  const current = Math.min(progress / duration * target, target);
		  card.innerText = new Intl.NumberFormat().format(Math.ceil(current)) + '+';
		  if (progress < duration) {
			requestAnimationFrame(updateNumber);
		  }
		};
		requestAnimationFrame(updateNumber);
	  });
	}

	// Trigger the animation when the metrics section is in view
	function handleScrollMetric() {
	  const metricsSection = document.querySelector('.metrics');
	  if (isInViewport(metricsSection)) {
		animateNumbers();
		window.removeEventListener('scroll', handleScrollMetric); // Stop listening after animation
	  }
	}

	// Testimonial Carousel
	let currentTestimonial = 0;
	const items = document.querySelectorAll('.carousel-item');
	const totalItems = items.length;

	function updateStack(direction) {
		const newIndex = direction === 'next' 
			? (currentTestimonial + 1) % totalItems 
			: (currentTestimonial - 1 + totalItems) % totalItems;
		
		// Update current index
		currentTestimonial = newIndex;
		
		// Update all cards' positions with increased spacing
		for (let i = 0; i < totalItems; i++) {
			const offset = (i - currentTestimonial + totalItems) % totalItems;
			const zIndex = 3 - ((offset + 1) % 3);
			
			// Doubled the transform values for larger gaps
			items[i].style.transform = `translateZ(${-40 * ((offset + 2) % 3)}px) translateY(${20 * ((offset + 2) % 3)}px)`;
			items[i].style.filter = `brightness(${1 - (0.1 * ((offset + 2) % 3))})`;
			items[i].style.zIndex = String(zIndex);
		}
	}

	// Event listeners for controls
	document.querySelector('.prev').addEventListener('click', () => {
		updateStack('prev');
	});

	document.querySelector('.next').addEventListener('click', () => {
		updateStack('next');
	});

	// Optional: Add keyboard navigation
	document.addEventListener('keydown', (e) => {
		if (e.key === 'ArrowLeft') {
			updateStack('prev');
		} else if (e.key === 'ArrowRight') {
			updateStack('next');
		}
	});

	// Initialize stack positions
	updateStack('next');

	document.querySelectorAll('a[href^="#"]').forEach(anchor => {
	  anchor.addEventListener('click', (e) => {
		e.preventDefault();
		const target = document.querySelector(anchor.getAttribute('href'));
		target.scrollIntoView({ behavior: 'smooth' });
	  });
	});

	// Video Thumbnail Click Handler
	document.addEventListener('click', (e) => {
	  // Only handle clicks outside the video carousel
	  if (!e.target.closest('.video-carousel') && !e.target.closest('.video-player-container')) {
		const videoItem = e.target.closest('.video-item');
		if (videoItem) {
		  const videoId = videoItem.dataset.videoId;
		  showVideo(videoId);
		}
	  }
	  
	  if (e.target.closest('.close-button')) {
		hideVideo();
	  }
	});

	// Play video inline - updated to hide menubar
	function playVideoInline(videoId) {
	  const playerContainer = document.querySelector('.video-player-container');
	  const player = document.getElementById('video-player');
	  const menubar = document.querySelector('header'); // Select the menubar/header
	  
	  // Create iframe
	  player.innerHTML = `
		<iframe 
		  width="100%" 
		  height="100%" 
		  src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
		  frameborder="0" 
		  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" 
		  allowfullscreen>
		</iframe>
	  `;
	  
	  // Show player and hide menubar
	  playerContainer.style.display = 'flex';
	  if (menubar) menubar.classList.add('hidden-during-video');
	}
	
	// Close video player - updated to show menubar again
	function closeVideoPlayer() {
	  const playerContainer = document.querySelector('.video-player-container');
	  const player = document.getElementById('video-player');
	  const menubar = document.querySelector('header'); // Select the menubar/header
	  
	  player.innerHTML = '';
	  playerContainer.style.display = 'none';
	  if (menubar) menubar.classList.remove('hidden-during-video');
	}

	function showVideo(videoId) {
	  const menubar = document.querySelector('header');
	  const lightbox = document.createElement('div');
	  lightbox.className = 'video-lightbox';
	  lightbox.innerHTML = `
		<div class="video-container">
		  <span class="close-button">&times;</span>
		  <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
				  frameborder="0" 
				  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" 
				  allowfullscreen></iframe>
		</div>
	  `;
	  
	  document.body.appendChild(lightbox);
	  lightbox.style.display = 'block';
	  if (menubar) menubar.classList.add('hidden-during-video');
	}

	function hideVideo() {
	  const lightbox = document.querySelector('.video-lightbox');
	  const menubar = document.querySelector('header');
	  
	  if (lightbox) {
		lightbox.remove();
	  }
	  if (menubar) menubar.classList.remove('hidden-during-video');
	}

	// Add this function after your existing code
	function generateInitials(name) {
	  return name
		.split(' ')
		.map(part => part[0])
		.join('')
		.toUpperCase();
	}

	document.addEventListener('DOMContentLoaded', function() {
		// Force disable animations on Android
		if (/Android/i.test(navigator.userAgent)) {
			// Add no-animation class to about section
			document.querySelectorAll('.about-text, .about-text p').forEach(element => {
				element.classList.add('no-animation');
				element.style.opacity = '1';
				element.style.transform = 'none';
				
				// Remove any animation-related attributes
				element.removeAttribute('data-animation');
				
				// Force immediate display
				element.style.display = 'block';
			});
			
			// Disable all existing animations
			const style = document.createElement('style');
			style.textContent = `
				.about-text, .about-text * {
					animation: none !important;
					-webkit-animation: none !important;
					transition: none !important;
					opacity: 1 !important;
					transform: none !important;
					-webkit-transform: none !important;
				}
			`;

			document.head.appendChild(style);
			
			const content = document.querySelector('.journey-content');
			
			const updateScrollbar = () => {
				const scrollPercentage = (content.scrollTop / (content.scrollHeight - content.clientHeight)) * 100;
				const thumbHeight = (content.clientHeight / content.scrollHeight) * 100;
				
				content.style.setProperty('--scroll-height', `${thumbHeight}%`);
				content.style.setProperty('--scroll-top', `${scrollPercentage}%`);
			};

			// Show scrollbar when scrolling
			let scrollTimer;
			content.addEventListener('scroll', () => {
				content.classList.add('is-scrolling');
				clearTimeout(scrollTimer);
				updateScrollbar();
				
				scrollTimer = setTimeout(() => {
					content.classList.remove('is-scrolling');
				}, 1000); // Hide after 1 second of no scrolling
			});

			// Show scrollbar on hover
			content.addEventListener('mouseenter', () => {
				content.classList.add('is-scrolling');
			});

			content.addEventListener('mouseleave', () => {
				if (!content.classList.contains('is-scrolling')) {
					content.classList.remove('is-scrolling');
				}
			});

			updateScrollbar();
		}

		// Add initials for testimonials without images
		document.querySelectorAll('.testimonial-card').forEach(card => {
			const img = card.querySelector('.author-image img');
			const authorName = card.querySelector('.author-name').textContent;
			
			// Check if image is missing or is a placeholder
			// Updated to handle the new path structure
			if (!img.src || 
				img.src.includes('placeholder-profile.jpg') || 
				img.src.includes('static_resources/images/placeholder-profile.jpg') ||
				img.getAttribute('src') === '' ||
				img.naturalWidth === 0) {
				
				const initials = generateInitials(authorName);
				
				// Check if initials div already exists
				if (!card.querySelector('.author-image div')) {
					const initialsDiv = document.createElement('div');
					initialsDiv.className = 'author-initials'; // Add a class for styling
					initialsDiv.textContent = initials;
					img.parentElement.appendChild(initialsDiv);
					
					// Hide the img element to show only initials
					img.style.display = 'none';
				}
			}
		});
	});

	// Close video when clicking outside
	document.addEventListener('click', (e) => {
	  if (e.target.classList.contains('video-lightbox')) {
		hideVideo();
	  }
	});

	// Close video with ESC key
	document.addEventListener('keydown', (e) => {
	  if (e.key === 'Escape') {
		hideVideo();
	  }
	});

	window.addEventListener('scroll', handleScrollMetric);

	// Add scroll event listener
	window.addEventListener('scroll', handleScroll);

	// Trigger the scroll event once on page load to check for elements already in the viewport
	window.addEventListener('load', handleScroll);

	// Gallery Popup functionality
	document.addEventListener('DOMContentLoaded', function() {
	  const galleryItems = document.querySelectorAll('.gallery-item');
	  let currentIndex = 0;
	  
	  // Create popup elements
	  const popup = document.createElement('div');
	  popup.className = 'gallery-popup';
	  popup.innerHTML = `
		<div class="gallery-popup-content">
		  <img src="" alt="">
		  <div class="gallery-popup-caption"></div>
		</div>
		<div class="gallery-popup-close"></div>
		<div class="gallery-popup-nav gallery-popup-prev"></div>
		<div class="gallery-popup-nav gallery-popup-next"></div>
	  `;
	  document.body.appendChild(popup);
	  
	  const popupImg = popup.querySelector('img');
	  const popupCaption = popup.querySelector('.gallery-popup-caption');
	  const closeBtn = popup.querySelector('.gallery-popup-close');
	  const prevBtn = popup.querySelector('.gallery-popup-prev');
	  const nextBtn = popup.querySelector('.gallery-popup-next');
	  
	  // Open popup function
	  function openPopup(index) {
		const item = galleryItems[index];
		const img = item.querySelector('img');
		const caption = item.querySelector('.gallery-overlay p')?.textContent || '';
		
		currentIndex = index;
		popupImg.src = img.src;
		popupCaption.textContent = caption;
		
		popup.classList.add('active');
		document.body.classList.add('gallery-popup-open');
	  }
	  
	  // Close popup function
	  function closePopup() {
		popup.classList.remove('active');
		document.body.classList.remove('gallery-popup-open');
	  }
	  
	  // Navigate to previous/next image
	  function navigate(direction) {
		currentIndex = (currentIndex + direction + galleryItems.length) % galleryItems.length;
		openPopup(currentIndex);
	  }
	  
	  // Add event listeners
	  galleryItems.forEach((item, index) => {
		item.addEventListener('click', () => openPopup(index));
	  });
	  
	  closeBtn.addEventListener('click', closePopup);
	  prevBtn.addEventListener('click', () => navigate(-1));
	  nextBtn.addEventListener('click', () => navigate(1));
	  
	  // Close on background click
	  popup.addEventListener('click', (e) => {
		if (e.target === popup) closePopup();
	  });
	  
	  // Keyboard navigation
	  document.addEventListener('keydown', (e) => {
		if (!popup.classList.contains('active')) return;
		
		if (e.key === 'Escape') closePopup();
		if (e.key === 'ArrowLeft') navigate(-1);
		if (e.key === 'ArrowRight') navigate(1);
	  });
	});

	// Calendly Integration
	function openCalendly() {
	  Calendly.initPopupWidget({
		  url: 'https://calendly.com/jsk-sagarvyas',
		color: '#03aeaf',
		textColor: '#333333',
		branding: true
	  });
	}

	// Add Calendly script to head
	const calendlyScript = document.createElement('script');
	calendlyScript.src = 'https://assets.calendly.com/assets/external/widget.js';
	calendlyScript.async = true;
	document.head.appendChild(calendlyScript);

	// Initialize OpenStreetMap with Leaflet
	document.addEventListener('DOMContentLoaded', function() {
	  // Check if map element exists
	  const mapElement = document.getElementById('map');
	  if (mapElement) {
	    // Coordinates for Murrayville Animal Hospital
	    const lat = 49.10784;
	    const lng = -122.65915;
	    
	    // Google Maps URL for directions
	    const googleMapsUrl = "https://www.google.com/maps/place/Murrayville+Animal+Hospital+%7C+Langley+Vets/@49.0907113,-122.6096197,16z/data=!3m1!4b1!4m6!3m5!1s0x5485ce5be38ea79f:0x2acf21990eddc546!8m2!3d49.0907113!4d-122.6070448!16s%2Fg%2F1tgf7gxk?entry=ttu&g_ep=EgoyMDI1MDMzMC4wIKXMDSoASAFQAw%3D%3D";
	    
	    // Initialize map
	    const map = L.map('map').setView([lat, lng], 16);
	    
	    // Add OpenStreetMap tiles
	    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	      maxZoom: 19,
	      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
	    }).addTo(map);
	    
	    // Add marker with custom popup
	    const marker = L.marker([lat, lng]).addTo(map);
	    
	    // Create custom popup content with a link
	    const popupContent = `
	      <div>
	        <b>Murrayville Animal Hospital</b><br>
	        22259 48 Ave Unit-203<br>
	        Langley, BC V3A 8T1<br>
	        <a href="${googleMapsUrl}" target="_blank">Get directions</a>
	      </div>
	    `;
	    
	    // Bind popup to marker
	    marker.bindPopup(popupContent);
	    
	    // Open popup by default
	    marker.openPopup();
	    
	    // Add click event to the marker itself
	    marker.on('click', function() {
	      window.open(googleMapsUrl, '_blank');
	    });
	  }
	});

	// Initiative Popup functionality
	document.addEventListener('DOMContentLoaded', function() {
	  // Get all "Learn More" links in initiative cards
	  const learnMoreLinks = document.querySelectorAll('.initiative-card .read-more');
	  
	  // Create popup element
	  const popup = document.createElement('div');
	  popup.className = 'initiative-popup';
	  popup.innerHTML = `
	    <div class="initiative-popup-content">
	      <div class="initiative-popup-close">&times;</div>
	      <div class="initiative-popup-image">
	        <img src="" alt="">
	      </div>
	      <div class="initiative-popup-text">
	        <h2 class="initiative-popup-title"></h2>
	        <div class="initiative-popup-body"></div>
	      </div>
	    </div>
	  `;
	  document.body.appendChild(popup);
	  
	  const popupImg = popup.querySelector('.initiative-popup-image img');
	  const popupTitle = popup.querySelector('.initiative-popup-title');
	  const popupBody = popup.querySelector('.initiative-popup-body');
	  const closeBtn = popup.querySelector('.initiative-popup-close');
	  
	  // Open popup function
	  function openInitiativePopup(card) {
	    const img = card.querySelector('.initiative-image img');
	    const title = card.querySelector('h3').textContent;
	    const excerpt = card.querySelector('.initiative-excerpt').textContent;
	    
	    // Set content in popup
	    popupImg.src = img.src;
	    popupImg.alt = img.alt;
	    popupTitle.textContent = title;
	    
	    // For the full article, we'll use the excerpt and add more content
	    // In a real implementation, you might fetch this from a database or CMS
	    popupBody.innerHTML = `
	      <p>${excerpt}</p>
	      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in dui mauris. 
	      Vivamus hendrerit arcu sed erat molestie vehicula. Sed auctor neque eu tellus rhoncus 
	      ut eleifend nibh porttitor. Ut in nulla enim.</p>
	      <p>Suspendisse in justo eu magna luctus suscipit. Sed lectus. Integer euismod lacus 
	      luctus magna. Quisque cursus, metus vitae pharetra auctor, sem massa mattis sem, 
	      at interdum magna augue eget diam.</p>
	    `;
	    
	    // Show popup
	    popup.classList.add('active');
	    document.body.classList.add('initiative-popup-open');
	  }
	  
	  // Close popup function
	  function closeInitiativePopup() {
	    popup.classList.remove('active');
	    document.body.classList.remove('initiative-popup-open');
	  }
	  
	  // Add event listeners to all "Learn More" links
	  learnMoreLinks.forEach(link => {
	    link.addEventListener('click', (e) => {
	      e.preventDefault();
	      const card = link.closest('.initiative-card');
	      openInitiativePopup(card);
	    });
	  });
	  
	  // Close button event listener
	  closeBtn.addEventListener('click', closeInitiativePopup);
	  
	  // Close on background click
	  popup.addEventListener('click', (e) => {
	    if (e.target === popup) closeInitiativePopup();
	  });
	  
	  // Close with ESC key
	  document.addEventListener('keydown', (e) => {
	    if (e.key === 'Escape' && popup.classList.contains('active')) {
	      closeInitiativePopup();
	    }
	  });
	});
