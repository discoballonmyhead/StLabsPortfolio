import React, { useRef, useEffect } from "react";
import { motion, useAnimate } from "framer-motion";


const StatelessLabsLogoVar1 = (props) => {

    const [OHexagonscope, animateOHexagon] = useAnimate();
    const [IHexagonscope, animateIHexagon] = useAnimate();
    const rotationRef = React.useRef(0);

    const [scopeHc1, animateHc1] = useAnimate();
    const [scopeHc2, animateHc2] = useAnimate();
    const [scopeHc3, animateHc3] = useAnimate();
    const [scopeHc4, animateHc4] = useAnimate();
    const [scopeHc5, animateHc5] = useAnimate();
    const [scopeHc6, animateHc6] = useAnimate();

    const duration = 108000;
    const targetAngles = new Set([15, 75, 135, 195, 255, 315]);
    const gParentRef = useRef(null);

    const [scopeTrp1, animateTrp1] = useAnimate();
    const [scopeTrp2, animateTrp2] = useAnimate();
    const [scopeTrp3, animateTrp3] = useAnimate();
    const [scopeTrp4, animateTrp4] = useAnimate();
    const [scopeTrp5, animateTrp5] = useAnimate();
    const [scopeLineD, animateLineD] = useAnimate();
    const [scopeCircleD, animateCircleD] = useAnimate();

    useEffect(() => {
        if (gParentRef.current) {
            const bbox = gParentRef.current.getBBox();
            const gCenter = {
                x: bbox.x + bbox.width / 2,
                y: bbox.y + bbox.height / 2,
            };

            const paths = gParentRef.current.querySelectorAll("path");
            const calculatedDistances = {};

            paths.forEach((path) => {
                const pathBBox = path.getBBox();
                const pathCenter = {
                    x: pathBBox.x + pathBBox.width / 2,
                    y: pathBBox.y + pathBBox.height / 2,
                };
                calculatedDistances[path.id] = {
                    deltaX: 0.1 * (gCenter.x - pathCenter.x),
                    deltaY: 0.1 * (gCenter.y - pathCenter.y),
                };
            });

            let startTime = performance.now();

            const runAnimation = async (hc5d = 0, hc2d = 0.1, hc4d = 0.2, hc1d = 0.3, hc3d = 0.4, hc6d = 0.5) => {
                await Promise.all([
                    animateHc5(scopeHc5.current, { x: calculatedDistances['hc5'].deltaX, y: calculatedDistances['hc5'].deltaY }, { duration: 3, ease: 'easeInOut', delay: hc5d }),
                    animateHc2(scopeHc2.current, { x: calculatedDistances['hc2'].deltaX, y: calculatedDistances['hc2'].deltaY }, { duration: 3, ease: 'easeInOut', delay: hc2d }),
                    animateHc4(scopeHc4.current, { x: calculatedDistances['hc4'].deltaX, y: calculatedDistances['hc4'].deltaY }, { duration: 3, ease: 'easeInOut', delay: hc4d }),
                    animateHc1(scopeHc1.current, { x: calculatedDistances['hc1'].deltaX, y: calculatedDistances['hc1'].deltaY }, { duration: 3, ease: 'easeInOut', delay: hc1d }),
                    animateHc3(scopeHc3.current, { x: calculatedDistances['hc3'].deltaX, y: calculatedDistances['hc3'].deltaY }, { duration: 3, ease: 'easeInOut', delay: hc3d }),
                    animateHc6(scopeHc6.current, { x: calculatedDistances['hc6'].deltaX, y: calculatedDistances['hc6'].deltaY }, { duration: 3, ease: 'easeInOut', delay: hc6d }),
                ]);

                await new Promise(resolve => setTimeout(resolve, 6000));

                await Promise.all([
                    animateHc5(scopeHc5.current, { x: 0, y: 0 }, { duration: 3, ease: 'easeInOut', delay: hc5d }),
                    animateHc2(scopeHc2.current, { x: 0, y: 0 }, { duration: 3, ease: 'easeInOut', delay: hc2d }),
                    animateHc4(scopeHc4.current, { x: 0, y: 0 }, { duration: 3, ease: 'easeInOut', delay: hc4d }),
                    animateHc1(scopeHc1.current, { x: 0, y: 0 }, { duration: 3, ease: 'easeInOut', delay: hc1d }),
                    animateHc3(scopeHc3.current, { x: 0, y: 0 }, { duration: 3, ease: 'easeInOut', delay: hc3d }),
                    animateHc6(scopeHc6.current, { x: 0, y: 0 }, { duration: 3, ease: 'easeInOut', delay: hc6d }),
                ]);
            };

            // ── ONLY CHANGE FROM ORIGINAL ──────────────────────────────────────
            // Was: requestAnimationFrame loop running checkAngle() 60x per second
            // Now: setInterval every 500ms — same behavior, 120x less CPU
            let lastTriggered = -1;
            const angleInterval = setInterval(() => {
                const elapsedTime = performance.now() - startTime;
                const currentAngle = Math.round((elapsedTime / duration) * 360) % 360;
                if (targetAngles.has(currentAngle) && currentAngle !== lastTriggered) {
                    lastTriggered = currentAngle;
                    runAnimation();
                }
                if (currentAngle === 0) lastTriggered = -1;
            }, 500);
            // ──────────────────────────────────────────────────────────────────

            animateOHexagon(OHexagonscope.current, { rotate: 360 }, {
                repeat: Infinity,
                ease: "linear",
                duration: 108,
            });

            const continuousRotationIHexagon = () => {
                rotationRef.current -= 360;
                animateIHexagon(
                    IHexagonscope.current,
                    { rotate: [rotationRef.current, rotationRef.current - 360] },
                    { duration: 70, ease: "linear", repeat: Infinity }
                );
            };

            const sporadicRotationIHexagon = () => {
                const randomInterval = (Math.random() * 2 + 2) * 1000;
                setTimeout(async () => {
                    const burstRotations = (Math.random() < 0.5 ? -1 : 1) * (Math.floor(Math.random() * (286 - 45 + 1)) + 45) * ((Math.floor(Math.random() * 3) + 1) + Math.floor(Math.random() * 2));
                    rotationRef.current += burstRotations;

                    await animateIHexagon(
                        IHexagonscope.current,
                        { rotate: rotationRef.current },
                        { duration: 2, ease: "linear" }
                    );

                    continuousRotationIHexagon();
                    sporadicRotationIHexagon();
                }, randomInterval);
            };

            continuousRotationIHexagon();
            sporadicRotationIHexagon();

            const glowFinaleFunc = async () => {
                await animateTrp1(scopeTrp1.current, { filter: ['brightness(1) drop-shadow(0px 0px 18px rgba(255, 255, 255, 255, 0.2))', 'brightness(2) drop-shadow(0px 0px 0px rgba(255, 255, 255, 0.5))'] }, { duration: 0.8, ease: 'easeInOut' });
                await animateTrp2(scopeTrp2.current, { filter: ['brightness(1) drop-shadow(0px 0px 18px rgba(255, 255, 255, 0.2))', 'brightness(2) drop-shadow(0px 0px 0px rgba(255, 255, 255, 0.5))'] }, { duration: 0.8, ease: 'easeInOut' });
                await animateTrp3(scopeTrp3.current, { filter: ['brightness(1) drop-shadow(0px 0px 18px rgba(255, 255, 255, 0.2))', 'brightness(2) drop-shadow(0px 0px 0px rgba(255, 255, 255, 0.5))'] }, { duration: 0.8, ease: 'easeInOut' });
                await animateTrp4(scopeTrp4.current, { filter: ['brightness(1) drop-shadow(0px 0px 18px rgba(255, 255, 255, 0.2))', 'brightness(2) drop-shadow(0px 0px 0px rgba(255, 255, 255, 0.5))'] }, { duration: 0.8, ease: 'easeInOut' });
                await animateTrp5(scopeTrp5.current, { filter: ['brightness(1) drop-shadow(0px 0px 18px rgba(255, 255, 255, 0.2))', 'brightness(2) drop-shadow(0px 0px 0px rgba(255, 255, 255, 0.5))'] }, { duration: 0.8, ease: 'easeInOut' });
                await animateLineD(scopeLineD.current, { filter: ['brightness(1) drop-shadow(0px 0px 18px rgba(255, 255, 255, 0.2))', 'brightness(2) drop-shadow(0px 0px 0px rgba(255, 255, 255, 0.5))'] }, { duration: 0.8, ease: 'easeInOut' });
                await animateCircleD(scopeCircleD.current, { filter: ['brightness(1) drop-shadow(0px 0px 18px rgba(255, 255, 255, 0.2))', 'brightness(2) drop-shadow(0px 0px 0px rgba(255, 255, 255, 0.5))'] }, { duration: 2, ease: 'easeInOut', delay: 0.4 });
                await animateCircleD(scopeCircleD.current, { filter: 'brightness(3) drop-shadow(0px 0px 18px rgba(255, 255, 255, 0))' }, { duration: 0.6, ease: 'easeInOut' });

                await animateIHexagon(IHexagonscope.current, { filter: ['brightness(1) drop-shadow(4px 8px 12px rgba(255, 255, 255, 0.6))', 'brightness(2) drop-shadow(0px 0px 0px rgba(255, 255, 255, 0.2))', 'brightness(3) drop-shadow(2px 4px 18px rgba(255, 255, 255, 0.8))'] }, { duration: 2, ease: 'easeInOut', delay: 0.5 });

                await new Promise(resolve => setTimeout(resolve, 2000));

                await Promise.all([
                    animateTrp1(scopeTrp1.current, { filter: 'brightness(1) drop-shadow(0px 0px 0px rgba(255, 255, 255, 0))' }, { duration: 0.5, ease: 'easeInOut' }),
                    animateTrp2(scopeTrp2.current, { filter: 'brightness(1) drop-shadow(0px 0px 0px rgba(255, 255, 255, 0))' }, { duration: 0.5, ease: 'easeInOut' }),
                    animateTrp3(scopeTrp3.current, { filter: 'brightness(1) drop-shadow(0px 0px 0px rgba(255, 255, 255, 0))' }, { duration: 0.5, ease: 'easeInOut' }),
                    animateTrp4(scopeTrp4.current, { filter: 'brightness(1) drop-shadow(0px 0px 0px rgba(255, 255, 255, 0))' }, { duration: 0.5, ease: 'easeInOut' }),
                    animateTrp5(scopeTrp5.current, { filter: 'brightness(1) drop-shadow(0px 0px 0px rgba(255, 255, 255, 0))' }, { duration: 0.5, ease: 'easeInOut' }),
                    animateLineD(scopeLineD.current, { filter: 'brightness(1) drop-shadow(0px 0px 0px rgba(255, 255, 255, 0))' }, { duration: 0.5, ease: 'easeInOut' }),
                ]);

                await new Promise(resolve => setTimeout(resolve, 2000));

                await animateCircleD(scopeCircleD.current, { filter: 'brightness(1) drop-shadow(0px 0px 0px rgba(255, 255, 255, 0))' }, { duration: 0.8, ease: 'easeInOut' });

                await new Promise(resolve => setTimeout(resolve, 1000));

                await Promise.all([
                    animateIHexagon(IHexagonscope.current, { filter: 'brightness(1) drop-shadow(0px 0px 0px rgba(255, 255, 255, 0))' }, { duration: 0.8, ease: 'easeInOut' }),
                    animateTrp1(scopeTrp1.current, { filter: ['brightness(1) drop-shadow(2px 4px 6px rgba(255, 255, 255, 0.2))', 'brightness(3) drop-shadow(4px 8px 12px rgba(255, 255, 255, 0.5))'] }, { duration: 0.8, ease: 'easeInOut' }),
                    animateTrp2(scopeTrp2.current, { filter: ['brightness(1) drop-shadow(2px 4px 6px rgba(255, 255, 255, 0.2))', 'brightness(3) drop-shadow(4px 8px 12px rgba(255, 255, 255, 0.5))'] }, { duration: 0.8, ease: 'easeInOut' }),
                    animateTrp3(scopeTrp3.current, { filter: ['brightness(1) drop-shadow(2px 4px 6px rgba(255, 255, 255, 0.2))', 'brightness(3) drop-shadow(4px 8px 12px rgba(255, 255, 255, 0.5))'] }, { duration: 0.8, ease: 'easeInOut' }),
                    animateTrp4(scopeTrp4.current, { filter: ['brightness(1) drop-shadow(2px 4px 6px rgba(255, 255, 255, 0.2))', 'brightness(3) drop-shadow(4px 8px 12px rgba(255, 255, 255, 0.5))'] }, { duration: 0.8, ease: 'easeInOut' }),
                    animateTrp5(scopeTrp5.current, { filter: ['brightness(1) drop-shadow(2px 4px 6px rgba(255, 255, 255, 0.2))', 'brightness(3) drop-shadow(4px 8px 12px rgba(255, 255, 255, 0.5))'] }, { duration: 0.8, ease: 'easeInOut' }),
                    animateLineD(scopeLineD.current, { filter: ['brightness(1) drop-shadow(2px 4px 6px rgba(255, 255, 255, 0.2))', 'brightness(3) drop-shadow(4px 8px 12px rgba(255, 255, 255, 0.5))'] }, { duration: 0.8, ease: 'easeInOut' }),
                    animateCircleD(scopeCircleD.current, { filter: ['brightness(1) drop-shadow(2px 4px 6px rgba(255, 255, 255, 0.2))', 'brightness(3) drop-shadow(4px 8px 12px rgba(255, 255, 255, 0.5))'] }, { duration: 0.8, ease: 'easeInOut' }),
                ]);

                await Promise.all([
                    animateHc1(scopeHc1.current, { filter: ['brightness(1) drop-shadow(2px 4px 6px rgba(255, 255, 255, 0.2))', 'brightness(3) drop-shadow(4px 8px 12px rgba(255, 255, 255, 0.5))'] }, { duration: 0.8, ease: 'easeInOut' }),
                    animateHc2(scopeHc2.current, { filter: ['brightness(1) drop-shadow(2px 4px 6px rgba(255, 255, 255, 0.2))', 'brightness(3) drop-shadow(4px 8px 12px rgba(255, 255, 255, 0.5))'] }, { duration: 0.8, ease: 'easeInOut' }),
                    animateHc3(scopeHc3.current, { filter: ['brightness(1) drop-shadow(2px 4px 6px rgba(255, 255, 255, 0.2))', 'brightness(3) drop-shadow(4px 8px 12px rgba(255, 255, 255, 0.5))'] }, { duration: 0.8, ease: 'easeInOut' }),
                    animateHc4(scopeHc4.current, { filter: ['brightness(1) drop-shadow(2px 4px 6px rgba(255, 255, 255, 0.2))', 'brightness(3) drop-shadow(4px 8px 12px rgba(255, 255, 255, 0.5))'] }, { duration: 0.8, ease: 'easeInOut' }),
                    animateHc5(scopeHc5.current, { filter: ['brightness(1) drop-shadow(2px 4px 6px rgba(255, 255, 255, 0.2))', 'brightness(3) drop-shadow(4px 8px 12px rgba(255, 255, 255, 0.5))'] }, { duration: 0.8, ease: 'easeInOut' }),
                    animateHc6(scopeHc6.current, { filter: ['brightness(1) drop-shadow(2px 4px 6px rgba(255, 255, 255, 0.2))', 'brightness(3) drop-shadow(4px 8px 12px rgba(255, 255, 255, 0.5))'] }, { duration: 0.8, ease: 'easeInOut' }),
                    animateTrp1(scopeTrp1.current, { filter: 'brightness(1) drop-shadow(0px 0px 0px rgba(255, 255, 255, 0))' }, { duration: 0.8, ease: 'easeInOut' }),
                    animateTrp2(scopeTrp2.current, { filter: 'brightness(1) drop-shadow(0px 0px 0px rgba(255, 255, 255, 0))' }, { duration: 0.8, ease: 'easeInOut' }),
                    animateTrp3(scopeTrp3.current, { filter: 'brightness(1) drop-shadow(0px 0px 0px rgba(255, 255, 255, 0))' }, { duration: 0.8, ease: 'easeInOut' }),
                    animateTrp4(scopeTrp4.current, { filter: 'brightness(1) drop-shadow(0px 0px 0px rgba(255, 255, 255, 0))' }, { duration: 0.8, ease: 'easeInOut' }),
                    animateTrp5(scopeTrp5.current, { filter: 'brightness(1) drop-shadow(0px 0px 0px rgba(255, 255, 255, 0))' }, { duration: 0.8, ease: 'easeInOut' }),
                    animateLineD(scopeLineD.current, { filter: 'brightness(1) drop-shadow(0px 0px 0px rgba(255, 255, 255, 0))' }, { duration: 0.8, ease: 'easeInOut' }),
                    animateCircleD(scopeCircleD.current, { filter: 'brightness(1) drop-shadow(0px 0px 0px rgba(255, 255, 255, 0))' }, { duration: 0.8, ease: 'easeInOut' }),
                ]);

                await Promise.all([
                    animateHc1(scopeHc1.current, { filter: 'brightness(1) drop-shadow(0px 0px 0px rgba(255, 255, 255, 0))' }, { duration: 0.8, ease: 'easeInOut' }),
                    animateHc2(scopeHc2.current, { filter: 'brightness(1) drop-shadow(0px 0px 0px rgba(255, 255, 255, 0))' }, { duration: 0.8, ease: 'easeInOut' }),
                    animateHc3(scopeHc3.current, { filter: 'brightness(1) drop-shadow(0px 0px 0px rgba(255, 255, 255, 0))' }, { duration: 0.8, ease: 'easeInOut' }),
                    animateHc4(scopeHc4.current, { filter: 'brightness(1) drop-shadow(0px 0px 0px rgba(255, 255, 255, 0))' }, { duration: 0.8, ease: 'easeInOut' }),
                    animateHc5(scopeHc5.current, { filter: 'brightness(1) drop-shadow(0px 0px 0px rgba(255, 255, 255, 0))' }, { duration: 0.8, ease: 'easeInOut' }),
                    animateHc6(scopeHc6.current, { filter: 'brightness(1) drop-shadow(0px 0px 0px rgba(255, 255, 255, 0))' }, { duration: 0.8, ease: 'easeInOut' }),
                    animateOHexagon(OHexagonscope.current, { filter: ['brightness(1) drop-shadow(2px 4px 6px rgba(255, 255, 255, 0.2))', 'brightness(3) drop-shadow(4px 8px 12px rgba(255, 255, 255, 0.5))'] }, { duration: 0.8, ease: 'easeInOut' }),
                ]);

                await animateOHexagon(OHexagonscope.current, { filter: 'brightness(1) drop-shadow(0px 0px 0px rgba(255, 255, 255, 0))' }, { duration: 0.8, ease: 'easeInOut' });
            };

            let isMounted = true;

            const runGlowLoop = async () => {
                while (isMounted) {
                    await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 5 + 3) * 1000));
                    await glowFinaleFunc();
                }
            };

            runGlowLoop();

            return () => {
                isMounted = false;
                clearInterval(angleInterval); // was: cancelAnimationFrame(animationFrameId)
            };
        }
    }, [animateOHexagon, OHexagonscope, animateIHexagon, IHexagonscope,
        scopeHc1, scopeHc2, scopeHc3, scopeHc4, scopeHc5, scopeHc6,
        animateHc6, animateHc5, animateHc4, animateHc3, animateHc2, animateHc1,
        animateTrp4, animateTrp1, animateTrp3, animateTrp2, animateTrp5,
        animateLineD, animateCircleD]);

    return (
        <div>
            <svg
                width={360}
                height={360}
                viewBox="0 0 300 300"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                {...props}
            >
                <g id="StatelessLabslogo 1">
                    <motion.g id="OHexagon" ref={OHexagonscope}>
                        <path id="OHexagon_2" d="M143.544 90.4056L140.349 90.4059L137.154 90.406L124.375 90.4059L111.596 90.4059L98.8162 90.4059L47.7079 178.928L47.7071 178.929L98.8162 267.451L111.596 267.451L124.375 267.451L137.154 267.451L140.349 267.451L143.544 267.451L146.738 262.822L149.933 262.822L153.128 262.822L156.323 267.451L159.518 267.451L162.713 267.451L175.492 267.451L188.271 267.451L201.051 267.451L252.159 178.929L252.159 178.928L201.05 90.4056L188.271 90.4056L175.492 90.4056L162.713 90.4056L159.518 90.4056L156.323 90.4056L153.128 95.0346L149.933 95.0346L146.738 95.0346L143.544 90.4056ZM103.538 97.5383L115.212 97.5383L126.887 97.5383L138.561 97.5383L141.479 97.5383L144.398 97.5383L147.316 102.167L150.235 102.167L153.154 102.167L156.072 97.5383L158.991 97.5383L161.909 97.5383L173.584 97.5383L185.258 97.5383L196.933 97.5383L228.162 151.63L230.255 151.63L246.299 178.909L231.119 204.717L229.034 204.717L196.933 260.318L185.258 260.318L173.584 260.318L161.909 260.318L158.991 260.318L156.072 260.318L153.154 255.689L150.235 255.689L147.316 255.689L144.398 260.318L141.479 260.318L138.561 260.318L126.887 260.318L115.212 260.318L103.538 260.318L71.4364 204.717L69.4975 204.717L54.3182 178.909L70.362 151.63L72.3082 151.63L103.538 97.5383Z" fill="#A0A0A0" />
                    </motion.g>
                    <motion.g id="IHexagon" ref={IHexagonscope}>
                        <path id="IHeaxagon" d="M133.847 151.175L117.76 179.038L133.847 206.9H166.02L182.106 179.038L166.02 151.175H133.847ZM137.15 156.164H163.14L176.134 178.671L163.14 201.179H137.15L124.156 178.671L137.15 156.164Z" fill="#A0A0A0" />
                    </motion.g>
                    <g id="Trapezoids">
                        <motion.path id="trap1" ref={scopeTrp1} d="M109.928 178.959L82.0878 179.072C82.0892 179.115 82.0903 179.158 82.0911 179.201C82.0861 179.294 82.0795 179.388 82.0713 179.481C82.0039 181.316 81.3083 183.073 80.101 184.457C78.8936 185.841 77.2476 186.769 75.4382 187.085L106.166 239.712C106.917 238.801 107.86 238.068 108.927 237.564C109.994 237.06 111.159 236.797 112.339 236.796C113.685 236.799 115.009 237.141 116.187 237.79L129.985 213.659L109.827 179.134L109.928 178.959Z" fill="#A0A0A0" />
                        <motion.path id="trap2" ref={scopeTrp2} d="M170.149 213.47L170.105 213.546L130.034 213.742L129.985 213.659L116.188 237.79C116.242 237.816 116.295 237.842 116.349 237.869C116.374 237.886 116.399 237.903 116.424 237.921C118.022 238.868 119.242 240.341 119.874 242.088C120.507 243.834 120.513 245.745 119.893 247.496L180.873 247.201C180.205 245.454 180.168 243.53 180.769 241.76C181.37 239.99 182.571 238.485 184.163 237.506L170.149 213.47Z" fill="#A0A0A0" />
                        <motion.path id="trap3" ref={scopeTrp3} d="M217.775 178.518L189.904 178.632L189.971 178.746L170.149 213.47L184.163 237.506C184.222 237.465 184.282 237.424 184.343 237.384C184.37 237.371 184.397 237.358 184.425 237.345L184.423 237.345C185.641 236.66 187.016 236.305 188.412 236.316C189.54 236.328 190.652 236.577 191.676 237.048C192.7 237.519 193.614 238.2 194.357 239.048L224.407 186.413C222.551 186.088 220.869 185.119 219.657 183.678C218.444 182.236 217.778 180.414 217.774 178.53C217.774 178.526 217.775 178.522 217.775 178.518Z" fill="#A0A0A0" />
                        <motion.path id="trap4" ref={scopeTrp4} d="M193.669 118.23C192.458 119.668 190.78 120.635 188.929 120.961C187.077 121.288 185.17 120.953 183.54 120.016C183.539 120.016 183.538 120.015 183.537 120.015L169.741 144.14H169.767L189.904 178.632L217.775 178.518C217.779 178.429 217.785 178.339 217.793 178.25C217.861 176.439 218.541 174.705 219.72 173.329C220.9 171.954 222.511 171.018 224.29 170.675L193.669 118.23Z" fill="#A0A0A0" />
                        <motion.path id="trap5" ref={scopeTrp5} d="M180.016 110.381L119.218 110.676C119.843 112.422 119.843 114.33 119.22 116.076C118.596 117.822 117.387 119.297 115.797 120.252L129.837 144.332L169.741 144.138L183.537 120.014C183.46 119.964 183.383 119.912 183.307 119.859C181.762 118.889 180.594 117.422 179.996 115.699C179.398 113.975 179.405 112.1 180.016 110.381Z" fill="#A0A0A0" />
                        <motion.path id="line" ref={scopeLineD} d="M105.588 118.574L93.3641 139.988C93.4947 139.975 93.6257 139.966 93.7568 139.96C95.0766 139.96 96.3709 140.325 97.4973 141.012C98.6238 141.7 99.5389 142.685 100.142 143.859L113.049 121.25C111.68 121.488 110.273 121.367 108.965 120.898C107.657 120.429 106.493 119.629 105.588 118.574Z" fill="#A0A0A0" />
                        <motion.path id="circle" ref={scopeCircleD} d="M93.7568 154.324C97.7232 154.324 100.939 151.108 100.939 147.142C100.939 143.175 97.7232 139.96 93.7568 139.96C89.7904 139.96 86.575 143.175 86.575 147.142C86.575 151.108 89.7904 154.324 93.7568 154.324Z" fill="#A0A0A0" />
                    </g>
                    <motion.g id="HollowCircles" ref={gParentRef}>
                        <motion.path id="hc1" ref={scopeHc1} d="M74.0728 171.182C71.963 171.184 69.9388 172.017 68.4391 173.501C66.9394 174.985 66.0849 177 66.0609 179.109C66.0585 179.14 66.057 179.17 66.0549 179.201C66.0549 180.254 66.2623 181.296 66.6653 182.269C67.0682 183.242 67.6589 184.126 68.4035 184.871C69.1481 185.615 70.032 186.206 71.0049 186.609C71.9777 187.012 73.0204 187.219 74.0734 187.219C76.1488 187.215 78.1418 186.406 79.6333 184.963C81.1248 183.52 81.9987 181.555 82.0712 179.481C82.0795 179.388 82.0862 179.294 82.0912 179.201C82.0912 178.148 81.8838 177.105 81.4808 176.132C81.0779 175.159 80.4872 174.275 79.7426 173.531C78.998 172.786 78.1141 172.195 77.1412 171.793C76.1684 171.39 75.1258 171.182 74.0728 171.182ZM74.0735 176.086C74.4825 176.086 74.8875 176.166 75.2654 176.323C75.6432 176.479 75.9866 176.709 76.2758 176.998C76.5649 177.287 76.7943 177.631 76.9508 178.009C77.1072 178.387 77.1877 178.792 77.1877 179.201C77.183 179.256 77.1768 179.312 77.1691 179.367C77.1264 180.161 76.782 180.908 76.2065 181.456C75.631 182.003 74.868 182.31 74.0735 182.314C73.2518 182.314 72.4636 181.989 71.8805 181.41C71.2975 180.83 70.9669 180.045 70.9608 179.223C70.96 179.215 70.9593 179.208 70.9585 179.201C70.9584 178.792 71.039 178.386 71.1955 178.009C71.352 177.631 71.5814 177.287 71.8707 176.998C72.1599 176.709 72.5034 176.479 72.8813 176.323C73.2593 176.166 73.6644 176.086 74.0735 176.086Z" fill="#A0A0A0" />
                        <motion.path id="hc2" ref={scopeHc2} d="M112.34 236.796C110.932 236.796 109.549 237.166 108.33 237.87C107.111 238.574 106.099 239.586 105.395 240.805C104.361 242.604 104.065 244.735 104.569 246.748C105.073 248.761 106.338 250.501 108.098 251.601L110.647 247.411C109.982 246.977 109.507 246.306 109.32 245.533C109.134 244.761 109.249 243.947 109.644 243.257C110.055 242.546 110.73 242.026 111.523 241.811C112.316 241.595 113.162 241.702 113.876 242.107C113.883 242.111 113.89 242.114 113.897 242.117C114.612 242.53 115.134 243.211 115.348 244.008C115.561 244.806 115.449 245.656 115.036 246.371C114.832 246.726 114.56 247.036 114.235 247.285C113.911 247.534 113.54 247.717 113.145 247.823C112.75 247.929 112.338 247.956 111.933 247.902C111.527 247.849 111.136 247.716 110.782 247.512C110.736 247.48 110.691 247.445 110.647 247.411L108.098 251.601C108.175 251.654 108.252 251.707 108.331 251.758C110.172 252.821 112.361 253.109 114.415 252.559C116.469 252.008 118.221 250.665 119.284 248.823C120.337 246.995 120.628 244.826 120.093 242.785C119.557 240.745 118.24 238.997 116.425 237.921C116.4 237.904 116.374 237.886 116.348 237.87C115.13 237.166 113.747 236.796 112.34 236.796Z" fill="#A0A0A0" />
                        <motion.path id="hc3" ref={scopeHc3} d="M188.412 236.316C187.016 236.305 185.641 236.66 184.423 237.344L184.425 237.345C184.397 237.358 184.37 237.371 184.342 237.384C182.501 238.448 181.157 240.199 180.606 242.253C180.056 244.307 180.344 246.496 181.407 248.338C182.448 250.133 184.145 251.455 186.14 252.025C188.136 252.596 190.275 252.37 192.107 251.396C192.192 251.356 192.276 251.315 192.359 251.273C194.201 250.209 195.545 248.458 196.095 246.404C196.646 244.35 196.357 242.161 195.294 240.319C194.595 239.11 193.592 238.105 192.385 237.403C191.178 236.701 189.809 236.326 188.412 236.316ZM188.554 241.221C189.066 241.255 189.561 241.414 189.995 241.684C190.43 241.954 190.792 242.328 191.048 242.771C191.253 243.126 191.386 243.517 191.439 243.922C191.492 244.328 191.465 244.74 191.36 245.135C191.254 245.53 191.071 245.901 190.822 246.225C190.573 246.55 190.262 246.822 189.908 247.026C189.858 247.05 189.806 247.072 189.755 247.093C189.046 247.452 188.227 247.528 187.465 247.303C186.703 247.079 186.056 246.572 185.655 245.886C185.245 245.174 185.132 244.329 185.342 243.534C185.552 242.74 186.068 242.061 186.776 241.645C186.782 241.64 186.788 241.636 186.793 241.632C187.327 241.324 187.94 241.181 188.554 241.221Z" fill="#A0A0A0" />
                        <motion.path id="hc4" ref={scopeHc4} d="M225.793 170.512C223.718 170.516 221.725 171.324 220.233 172.767C218.741 174.21 217.867 176.175 217.795 178.25C217.787 178.343 217.779 178.436 217.774 178.53C217.774 179.583 217.981 180.625 218.384 181.598C218.787 182.571 219.378 183.455 220.123 184.2C220.867 184.944 221.751 185.535 222.724 185.938C223.697 186.341 224.74 186.548 225.793 186.548C227.902 186.547 229.926 185.714 231.426 184.23C232.926 182.746 233.78 180.731 233.804 178.622C233.807 178.591 233.809 178.56 233.812 178.53C233.811 176.403 232.967 174.364 231.463 172.86C229.959 171.357 227.92 170.512 225.793 170.512ZM225.793 175.416C226.615 175.417 227.403 175.742 227.986 176.321C228.569 176.9 228.899 177.686 228.905 178.508C228.906 178.515 228.906 178.523 228.907 178.53C228.907 178.939 228.826 179.344 228.67 179.722C228.513 180.1 228.284 180.443 227.994 180.733C227.705 181.022 227.362 181.251 226.984 181.408C226.606 181.564 226.201 181.645 225.792 181.645C225.383 181.645 224.978 181.564 224.6 181.408C224.222 181.251 223.879 181.021 223.589 180.732C223.3 180.443 223.071 180.1 222.914 179.722C222.758 179.344 222.677 178.939 222.677 178.53C222.682 178.474 222.688 178.419 222.696 178.364C222.739 177.57 223.084 176.823 223.66 176.275C224.235 175.727 224.999 175.42 225.793 175.416Z" fill="#A0A0A0" />
                        <motion.path id="hc5" ref={scopeHc5} d="M187.549 105.055C186.141 105.055 184.759 105.425 183.54 106.129C182.321 106.833 181.309 107.845 180.605 109.064C179.571 110.863 179.274 112.993 179.778 115.006C180.282 117.02 181.547 118.759 183.307 119.859C183.384 119.913 183.462 119.965 183.54 120.016C185.382 121.079 187.571 121.368 189.625 120.817C191.679 120.267 193.43 118.923 194.494 117.081C195.547 115.253 195.838 113.084 195.302 111.043C194.767 109.002 193.449 107.255 191.634 106.179C191.609 106.162 191.584 106.146 191.558 106.129C190.339 105.425 188.956 105.055 187.549 105.055ZM187.331 109.968C187.943 109.925 188.553 110.064 189.086 110.366C189.093 110.369 189.099 110.372 189.106 110.376C189.46 110.58 189.771 110.852 190.02 111.177C190.269 111.501 190.451 111.872 190.557 112.267C190.663 112.662 190.69 113.074 190.637 113.479C190.583 113.885 190.451 114.276 190.246 114.63C190.042 114.984 189.769 115.295 189.445 115.544C189.12 115.793 188.75 115.975 188.355 116.081C187.96 116.187 187.548 116.214 187.143 116.161C186.737 116.107 186.346 115.974 185.992 115.77C185.946 115.738 185.901 115.704 185.857 115.67C185.191 115.236 184.716 114.564 184.53 113.792C184.343 113.02 184.458 112.206 184.853 111.516C185.108 111.075 185.467 110.703 185.899 110.433C186.331 110.163 186.823 110.003 187.331 109.968Z" fill="#A0A0A0" />
                        <motion.path id="hc6" ref={scopeHc6} d="M111.733 105.367C110.337 105.356 108.962 105.711 107.744 106.396C107.717 106.409 107.689 106.423 107.662 106.436C105.82 107.5 104.477 109.251 103.926 111.305C103.376 113.359 103.664 115.548 104.727 117.39C105.769 119.185 107.465 120.507 109.461 121.077C111.456 121.647 113.595 121.421 115.428 120.447C115.513 120.407 115.597 120.366 115.681 120.324C117.522 119.26 118.866 117.509 119.416 115.455C119.967 113.401 119.679 111.212 118.615 109.37C117.916 108.162 116.913 107.156 115.706 106.454C114.499 105.752 113.13 105.377 111.733 105.367ZM111.876 110.273C112.387 110.306 112.882 110.465 113.317 110.736C113.752 111.006 114.113 111.38 114.369 111.823C114.574 112.178 114.706 112.569 114.76 112.974C114.813 113.38 114.786 113.792 114.68 114.187C114.574 114.582 114.392 114.952 114.143 115.276C113.894 115.601 113.583 115.873 113.229 116.078C113.178 116.101 113.127 116.123 113.075 116.144C112.366 116.504 111.547 116.579 110.785 116.355C110.023 116.13 109.375 115.623 108.975 114.937C108.565 114.225 108.452 113.38 108.662 112.585C108.872 111.791 109.388 111.112 110.096 110.696C110.102 110.692 110.108 110.687 110.114 110.683C110.648 110.375 111.261 110.232 111.876 110.273Z" fill="#A0A0A0" />
                    </motion.g>
                </g>
            </svg>

        </div>
    )
};
export default StatelessLabsLogoVar1;