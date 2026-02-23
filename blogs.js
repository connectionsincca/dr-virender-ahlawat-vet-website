// JavaScript for Blogs Functionality 
// Expand/Collapse Individual Blogs
// Function to expand a specific blog based on URL hash
function expandBlogFromHash() {
  const hash = window.location.hash;
  if (hash && hash.startsWith('#blog')) {
    try {
      const blogItem = document.querySelector(hash);
      if (blogItem) {
        // Hide preview, show full content
        blogItem.querySelector('.blog-preview').style.display = 'none';
        blogItem.querySelector('.blog-full').style.display = 'block';
        
        // Scroll to the blog with a slight offset
        setTimeout(() => {
          blogItem.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    } catch (error) {
      console.error('Hash Navigation Error:', error);
    }
  }
}

// Run on page load
document.addEventListener('DOMContentLoaded', () => {
  expandBlogFromHash();
  
  // Listen for hash changes (if user navigates with browser back/forward)
  window.addEventListener('hashchange', expandBlogFromHash);
});

// Modify read-more links to update URL hash
try {
  document.querySelectorAll('.read-more').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const blogItem = link.closest('.blog-item');
      const blogId = blogItem.id;
      
      // Update URL without reloading the page
      history.pushState(null, null, `#${blogId}`);
      
      // Show full blog content
      blogItem.querySelector('.blog-preview').style.display = 'none';
      blogItem.querySelector('.blog-full').style.display = 'block';
    });
  });
} catch (error) {
  console.error('Read More Click Error:', error);
}

// Modify collapse links to remove hash from URL
try {
  document.querySelectorAll('.collapse').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const blogItem = link.closest('.blog-item');
      
      // Remove hash from URL
      history.pushState(null, null, window.location.pathname);
      
      // Hide full content, show preview
      blogItem.querySelector('.blog-preview').style.display = 'block';
      blogItem.querySelector('.blog-full').style.display = 'none';
    });
  });
} catch (error) {
  console.error('Collapse Click Error:', error);
}

// Existing code for expand/collapse all
try {
  document.getElementById('expand-all').addEventListener('click', (e) => {
    e.preventDefault();
    // Remove hash when expanding all
    history.pushState(null, null, window.location.pathname);
    document.querySelectorAll('.blog-item').forEach((blog) => {
      blog.querySelector('.blog-preview').style.display = 'none';
      blog.querySelector('.blog-full').style.display = 'block';
    });
  });
} catch (error) {
  console.error('Expand All Error:', error);
}

try {
  document.getElementById('collapse-all').addEventListener('click', (e) => {
    e.preventDefault();
    // Remove hash when collapsing all
    history.pushState(null, null, window.location.pathname);
    document.querySelectorAll('.blog-item').forEach((blog) => {
      blog.querySelector('.blog-preview').style.display = 'block';
      blog.querySelector('.blog-full').style.display = 'none';
    });
  });
} catch (error) {
  console.error('Collapse All Error:', error);
}

// Add to home.js
document.querySelectorAll('.blogs-menu h3').forEach(header => {
  header.addEventListener('click', () => {
    const menu = header.nextElementSibling;
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  });
	});

// Add Calendly function to blogs.js
function openCalendly() {
  Calendly.initPopupWidget({
	  url: 'https://calendly.com/jsk-sagarvyas',
    color: '#03aeaf',
    textColor: '#333333',
    branding: true
  });
}
