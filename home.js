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
		  item.classList.remove('active', 'prev', 'next', 'prev-hidden', 'next-hidden', 'far-hidden');
		  const position = (index - currentVideoIndex + totalVideos) % totalVideos;
		  if (position === 0) {
			item.classList.add('active');
		  } else if (position === 1 || position === (totalVideos - 1)) {
			item.classList.add(position === 1 ? 'next' : 'prev');
		  } else if (position === 2 || position === (totalVideos - 2)) {
			item.classList.add(position === 2 ? 'next-hidden' : 'prev-hidden');
		  } else {
			item.classList.add('far-hidden');
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

	// Single observer created once — observes all animated elements
	const animationObserver = new IntersectionObserver((entries) => {
	  entries.forEach(entry => {
		if (entry.isIntersecting) {
		  const animationType = entry.target.getAttribute('data-animation');
		  entry.target.classList.add(animationType);
		  entry.target.style.opacity = 1;
		}
	  });
	}, { threshold: 0.5 });

	document.querySelectorAll('[data-animation]').forEach((element) => {
	  animationObserver.observe(element);
	});

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
		currentTestimonial = newIndex;
		for (let i = 0; i < totalItems; i++) {
			const offset = (i - currentTestimonial + totalItems) % totalItems;
			if (offset >= 3) {
				// Hide items beyond the visible 3-card stack
				items[i].style.opacity = '0';
				items[i].style.zIndex = '-1';
				items[i].style.transform = 'translateZ(-80px) translateY(40px)';
				items[i].style.filter = 'brightness(0.8)';
			} else {
				const pos = (offset + 2) % 3;
				items[i].style.opacity = '1';
				items[i].style.transform = `translateZ(${-40 * pos}px) translateY(${20 * pos}px)`;
				items[i].style.filter = `brightness(${1 - (0.1 * pos)})`;
				items[i].style.zIndex = String(3 - ((offset + 1) % 3));
			}
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

	function openCalendly() {
	  window.open('http://www.murrayvilleanimalhospital.ca/contact.html', '_blank');
	}

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
	    

	    const initiativeDetails = {
      'Monthly Community Wellness Day': `
        <p>${excerpt}</p>
        <p>Every first Tuesday of the month, I open the doors of Murrayville Animal Hospital to the community. That day, every pet gets a full physical examination and wellness check-up — completely free of charge. Families are only asked to pay for the vaccines their pet needs.</p>
        <p>The reason is simple. I have seen too many cases where a small, preventable problem became a serious one — not because the owner did not care, but because the cost of a routine visit felt like too much. I never want a family to have to make that choice.</p>
        <p>So once a month, that barrier disappears. You come in, your pet gets looked after, and we have a conversation about their health — no financial pressure, no hesitation. Just care.</p>
        <p>This initiative has quietly become one of the things I am most proud of. It is not grand or dramatic. It just shows up, reliably, on the first Tuesday of every month. And that consistency is exactly the kind of relationship I want to have with this community.</p>
      `,
      'Stray Animal Rescue Program': `
        <p>${excerpt}</p>
        <p>I work alongside rescue organizations that save dogs from euthanasia lists — animals who have been abandoned, neglected, or left with medical conditions that make adoption difficult. Many arrive with serious health issues: dental disease, viral infections, untreated injuries. We often do not know their full story. Life is complicated. But whatever brought an animal to my door, one thing is clear: they still deserve a chance.</p>
        <p>I provide treatment for these animals at nearly 70% below standard cost — almost at cost price. I do not profit from these cases. That part of my work is not business. It is the reason I became a veterinarian.</p>
        <p>When a rescued dog is sick or visibly unwell, most families hesitate to adopt. I understand that. That is exactly why treatment matters. A healthy animal has a future. A sick one, without intervention, often does not.</p>
        <p>Over the years, I have saved many dogs who were once on euthanasia lists — including pregnant females who later gave birth to healthy litters. Watching a dog who nearly did not survive become a mother is something I will never take for granted.</p>
      `,
      'Nurturing Future Veterinarians': `
        <p>${excerpt}</p>
        <p>Every week, I welcome Grade 11 and Grade 12 students into our clinic — young people considering veterinary medicine, completing volunteer hours, or simply curious about what this work really looks like. I open the door and let them see it: the procedures, the decisions, the moments of uncertainty, and the moments of relief.</p>
        <p>What I want them to walk away with is not just knowledge about animals. I want them to understand what it means to take responsibility for a life. To stay calm when things are hard. To care about the outcome even when no one is watching.</p>
        <p>I do not charge them for this experience. Not a single dollar. Because I remember what it felt like to be young and passionate and unsure whether there was room for me in this field. If I can be the person who opens that door for someone else, that is more than enough.</p>
        <p>Several students who came through our clinic are now pursuing veterinary careers. When I hear that, I feel something I cannot quite put into words. Something like legacy — the quiet knowledge that the work continues beyond you.</p>
      `,
      'The Night We Refused to Give Up': `
        <p>${excerpt}</p>
        <p>I still remember the moment he was carried through our doors. A guard dog, barely conscious, covered in blood. He had been protecting a property when someone — possibly under the influence — attacked him with a knife. He had been stabbed more than 50 times.</p>
        <p>It felt almost unreal. Like something from a film, not a clinic in Langley.</p>
        <p>Other hospitals had already turned him away. They believed it was too late. When I examined him, I understood why they said that. But I also saw that he was still here, still fighting. And I made a decision: so would we.</p>
        <p>We operated for four to five hours. It was one of the longest and most intense surgeries I have performed. But when it was over, he was alive.</p>
        <p>Cases like this stay with you long after the wounds have healed. They remind you that this profession is not just about medicine — it is about the choice to show up for a life when no one else will. That night, I made that choice. And it is one I will never regret.</p>
      `,
      'Beating Parvo, Defying the Odds': `
        <p>${excerpt}</p>
        <p>Parvovirus is one of the hardest things I face in rescue work. It hits young puppies fast and hard — attacking their digestive system, destroying their ability to fight infection. Even with full treatment, survival is not guaranteed. Standard care can cost around $5,000 — far beyond what most rescue organizations can manage.</p>
        <p>When three rescue puppies arrived at my clinic with confirmed Parvo, I knew exactly how serious it was. I also knew I was not going to turn them away.</p>
        <p>I kept them hydrated, monitored their symptoms through the most critical hours, and did everything I could. It was exhausting and uncertain. With Parvo, you work hard and then you wait — and sometimes, the outcome still breaks your heart.</p>
        <p>Two of the three puppies survived.</p>
        <p>Today, those two come back to my clinic for their vaccines and check-ups. They are healthy. They are thriving. And every time they walk through my door, wagging their tails, I feel it — that feeling that only this work gives you. The feeling that a life exists today because you refused to give up on it.</p>
      `,
      'Every Day, One More Life': `
        <p>${excerpt}</p>
        <p>There is no single story that captures this part of my work — because it is not one story. It is hundreds of them, unfolding quietly, one at a time, every single day.</p>
        <p>On any given day, alongside my regular appointments, I may take on one or two rescue cases. A spay for a stray who arrived frightened and alone. A treatment for an abandoned dog whose previous owner could not afford the care — or whose circumstances I may never fully know. I have stopped asking why animals end up the way they do. What I can control is what happens next.</p>
        <p>Some of the most quietly moving cases I have handled were pregnant rescue dogs — animals pulled from euthanasia lists who arrived unwell and afraid, and who later gave birth to healthy litters. To watch a dog who nearly did not survive become a mother is something that does not easily leave you.</p>
        <p>This work does not make headlines. I do not announce it. But over the years, it adds up — hundreds of lives, hundreds of second chances, hundreds of animals who are alive today because someone chose, each day, to show up and try.</p>
        <p>That is what this profession means to me. Not the recognition. The showing up.</p>
      `
    };
    popupBody.innerHTML = initiativeDetails[title] || `<p>${excerpt}</p>`;
	    
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
