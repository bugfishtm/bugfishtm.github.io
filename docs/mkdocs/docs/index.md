# Bugfish

My name is Bugfish, and I've been a software developer since 2005. I'm really proud to collaborate with great partners and would like to extend my appreciation to all my friends and colleagues who are working with me. Feel free to join my discord and check out my websites/profiles for news!

!!! bug "If I’m offline for two weeks, I’m probably dead or arrested 🏴‍"
	Delivering software under pressure for <b><span id="current_days_write"></span></b> days.
 
<script>


const startDate = new Date('2018-08-17');
const today = new Date();
const diffTime = today - startDate; // difference in milliseconds
const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); // convert to days

document.getElementById('current_days_write').textContent = diffDays;
</script>

<div class="product-grid">

  <div class="product-card" onclick="window.open('https://bugfish.eu', '_blank');">
    <img src="./overview/bugfish.jpg" alt="Product Image" class="off-glb">
    <div class="product-card-content">
      <h3>Website</h3>
      <p style="font-size: 16px;">Website for my personal projects and much more.</p>
    </div>
  </div>

  <div class="product-card" onclick="window.open('https://suitefish.com', '_blank');">
    <img src="./overview/suitefish.png" alt="Product Image" class="off-glb">
    <div class="product-card-content">
      <h3>Suitefish</h3>
      <p style="font-size: 16px;">The official Suitefish-CMS website.</p>
    </div>
  </div>


  <div class="product-card" onclick="window.location.href='./social.html';">
    <img src="./overview/social.png" alt="Product Image" class="off-glb">
    <div class="product-card-content">
      <h3>Social</h3>
      <p style="font-size: 16px;">Join discussions and stay updated here.</p>
    </div>
  </div>

  <div class="product-card" onclick="window.location.href='./software.html';">
    <img src="./overview/software.png" alt="Product Image" class="off-glb">
    <div class="product-card-content">
      <h3>Software</h3>
      <p style="font-size: 16px;">In my collection, you will find various types of software.</p>
    </div>
  </div>

  <div class="product-card" onclick="window.location.href='./music.html';">
    <img src="./overview/music.png" alt="Product Image" class="off-glb">
    <div class="product-card-content">
      <h3>Music</h3>
      <p style="font-size: 16px;">Here, you can find my free-to-use and commercial music pieces.</p>
    </div>
  </div>

  <div class="product-card" onclick="window.location.href='./videos.html';">
    <img src="./overview/videos.png" alt="Product Image" class="off-glb">
    <div class="product-card-content">
      <h3>Digital Art</h3>
      <p style="font-size: 16px;">Image and video content from my projects.</p>
    </div>
  </div>

</div>

