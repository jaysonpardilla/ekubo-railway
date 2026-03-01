(function(){
		const carousel = document.querySelector('.carousel');
		if(!carousel) return;
		const track = carousel.querySelector('.carousel-track');
		const slides = Array.from(track.children);
		const prevBtn = carousel.querySelector('.carousel-btn.prev');
		const nextBtn = carousel.querySelector('.carousel-btn.next');
		const total = slides.length;
		let current = 1; // start at 1 so initial view is 1-left, 2-center, 3-right
		let timer = null; const INTERVAL = 5000;
		let slideWidth = 0, gap = 0, viewportWidth = 0;

		function measure(){
			// use offsetWidth for reliable integer pixel widths (includes padding/border)
			const style = getComputedStyle(track);
			// gap can be reported as 'gap' or 'column-gap' depending on browser
			const gapVal = style.getPropertyValue('gap') || style.getPropertyValue('column-gap') || '0px';
			gap = parseFloat(gapVal) || 0;
			const realSlideWidth = slides[0].offsetWidth;
			// desired visual extras for the centered card
			const CENTER_EXTRA_W = 40; // px added to centered card width
			const CENTER_EXTRA_H = 50; // px added to centered card height (visual)
			const baseImg = slides[0].querySelector('img');
			const baseImgHeight = baseImg ? baseImg.offsetHeight : 160;
			// compute non-uniform scales (width & height) to match requested extra px while using transform only
			const scaleX = 1 + CENTER_EXTRA_W / realSlideWidth;
			const scaleY = 1 + CENTER_EXTRA_H / baseImgHeight;
			// expose CSS vars for the active card transform
			carousel.style.setProperty('--center-scale-x', scaleX);
			carousel.style.setProperty('--center-scale-y', scaleY);
			const centerScaledWidth = realSlideWidth * scaleX;
			slideWidth = realSlideWidth + gap;
			const viewport = carousel.querySelector('.carousel-viewport');
			if(window.innerWidth > 900){
				// set viewport to sum of left small + center (scaled) + right small + two gaps
				const totalThree = realSlideWidth * 2 + centerScaledWidth + gap * 2;
				viewport.style.width = totalThree + 'px';
				carousel.style.width = totalThree + 'px';
				viewportWidth = totalThree;
			} else {
				viewport.style.width = '100%';
				carousel.style.width = '100%';
				viewportWidth = viewport.clientWidth || window.innerWidth;
			}
		}

		function updatePosition(skipTransition){
			if(skipTransition) track.style.transition = 'none';
			else track.style.transition = 'transform 600ms cubic-bezier(.2,.9,.2,1)';
			// compute offset so slide at `current` is centered in viewport
			// compute offset so the visual center of the `current` slide is centered in the viewport
			// slide left = current * slideWidth, center = left + slideWidth/2
			const offset = (current * slideWidth) + (slideWidth / 2) - (viewportWidth / 2);
			// apply transform in rAF to avoid layout thrash
			requestAnimationFrame(()=>{
				track.style.transform = `translateX(${-offset}px)`;
				if(skipTransition) requestAnimationFrame(()=> track.style.transition = 'transform 600ms cubic-bezier(.2,.9,.2,1)');
			});

			// update per-slide classes using modular relative indexing
			slides.forEach((s, i)=>{
				s.classList.remove('active','prev','next');
				const relative = (i - current + total) % total; // 0:center, 1:right, total-1:left
				if(relative === 0) s.classList.add('active');
				else if(relative === 1) s.classList.add('next');
				else if(relative === total - 1) s.classList.add('prev');
			});
		}

		function advance(delta=1){
			current = (current + delta + total) % total; // circular arithmetic
			updatePosition(false);
		}

		function startAutoplay(){ stopAutoplay(); timer = setInterval(()=> advance(1), INTERVAL); }
		function stopAutoplay(){ if(timer){ clearInterval(timer); timer = null; } }
		function resetAutoplay(){ startAutoplay(); }

		prevBtn.addEventListener('click', ()=>{ advance(-1); resetAutoplay(); });
		nextBtn.addEventListener('click', ()=>{ advance(1); resetAutoplay(); });

		// keyboard support
		carousel.addEventListener('keydown', (e)=>{
			if(e.key === 'ArrowLeft'){ advance(-1); resetAutoplay(); }
			else if(e.key === 'ArrowRight'){ advance(1); resetAutoplay(); }
		});

		// touch swipe (passive handlers for performance)
		let startX = 0, dx = 0;
		carousel.addEventListener('touchstart', (e)=>{ stopAutoplay(); startX = e.touches[0].clientX; }, {passive:true});
		carousel.addEventListener('touchmove', (e)=>{ dx = e.touches[0].clientX - startX; }, {passive:true});
		carousel.addEventListener('touchend', ()=>{ if(Math.abs(dx) > 50) advance(dx < 0 ? 1 : -1); resetAutoplay(); startX = dx = 0; }, {passive:true});

		// pointer drag for mouse
		let pointerDown = false, startPX = 0, moved = 0;
		carousel.addEventListener('pointerdown', (e)=>{ if(e.pointerType === 'mouse'){ stopAutoplay(); pointerDown = true; startPX = e.clientX; carousel.setPointerCapture(e.pointerId); } });
		carousel.addEventListener('pointermove', (e)=>{ if(!pointerDown) return; moved = e.clientX - startPX; });
		carousel.addEventListener('pointerup', (e)=>{ if(!pointerDown) return; pointerDown = false; try{ carousel.releasePointerCapture(e.pointerId); }catch(_){ } if(Math.abs(moved) > 50) advance(moved < 0 ? 1 : -1); resetAutoplay(); moved = 0; });

		// debounce helper for resize
		function debounce(fn, wait=120){ let t; return (...a)=>{ clearTimeout(t); t = setTimeout(()=> fn.apply(this,a), wait); }; }

		window.addEventListener('resize', debounce(()=>{ measure(); updatePosition(true); }, 120));

		// initialize after images have loaded to measure sizes
		function init(){
			measure();
			// initial positioning without transition
			updatePosition(true);
			// ensure slides hint browser for compositing
			slides.forEach(s=> s.style.willChange = 'transform,opacity');
			startAutoplay();
		}

		if(document.readyState === 'complete') init(); else window.addEventListener('load', init);
	})();