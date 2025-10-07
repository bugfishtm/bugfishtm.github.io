# Bugfish

**Welcome!** My name is Bugfish, and I've been a software developer since 2008. I'm really proud to collaborate with great partners and would like to extend my appreciation to all my friends and colleagues who are working with me. Feel free to join my discord and check out my websites/profiles for news!

I’ve been delivering software non-stop for <b><span id="current_days_write1"></span></b> days—while tackling government red tape and police checkpoints as part of my <b><span id="current_days_write"></span></b>-day journey in the anti-corruption business.
 
<script>
const startDate = new Date('2018-08-17');
const today = new Date();
const diffTime = today - startDate; // difference in milliseconds
const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); // convert to days

document.getElementById('current_days_write').textContent = diffDays;

const startDate1 = new Date('2008-08-17');
const today1 = new Date();
const diffTime1 = today1 - startDate1; // difference in milliseconds
const diffDays1 = Math.floor(diffTime1 / (1000 * 60 * 60 * 24)); // convert to days

document.getElementById('current_days_write1').textContent = diffDays1;
</script>

<div class="product-grid">

  <div class="product-card" onclick="window.open('https://bugfish.eu', '_blank');">
    <img src="./overview/bugfish.jpg" alt="Product Image" class="off-glb">
    <div class="product-card-content">
      <h3>Bugfish</h3>
    </div>
  </div>

  <div class="product-card" onclick="window.open('https://suitefish.com', '_blank');">
    <img src="./overview/suitefish.png" alt="Product Image" class="off-glb">
    <div class="product-card-content">
      <h3>Suitefish</h3>
    </div>
  </div>


  <div class="product-card" onclick="window.open('https://bugfishtm.itch.io/delayed', '_blank');">
    <img src="./overview/delayed.png" alt="Product Image" class="off-glb">
    <div class="product-card-content">
      <h3>Delayed (Game)</h3>
    </div>
  </div>


  <div class="product-card" onclick="window.location.href='./social.html';">
    <img src="./overview/social.png" alt="Product Image" class="off-glb">
    <div class="product-card-content">
      <h3>Social</h3>
    </div>
  </div>

  <div class="product-card" onclick="window.location.href='./releases.html';">
    <img src="./overview/software.png" alt="Product Image" class="off-glb">
    <div class="product-card-content">
      <h3>Releases</h3>
    </div>
  </div>

  <div class="product-card" onclick="window.location.href='./music.html';">
    <img src="./overview/music.png" alt="Product Image" class="off-glb">
    <div class="product-card-content">
      <h3>Music</h3>
    </div>
  </div>

  <div class="product-card" onclick="window.location.href='./digitalart.html';">
    <img src="./overview/videos.png" alt="Product Image" class="off-glb">
    <div class="product-card-content">
      <h3>Digital Art</h3>
    </div>
  </div>

</div>

