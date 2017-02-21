var PrimeTower = function (overrides) {
	if(!overrides) overrides = {};

	var DEBUGMODE = DEBUGMODE ? overrides.DEBUGMODE : false;
		filamentDiameter = 1.75,
		nozzleDiameter = overrides.nozzleDiameter > 0 ? nozzleDiameter : 0.4;
		linewidth = nozzleDiameter * 1.2,
		flowMultipler = 1.2,
	    extrusionMultipler = 1,
	    baseLayerExtrusionMultipler = 1.2,
	    currentlayerheight = overrides.firstLayerHeight > 0 ? overrides.firstLayerHeight : 0.2,
	    zOffset = overrides.zOffset ? overrides.zOffset : 0,
	    towerwidth = 5.6, //minimum tower width, if the total extrusion length cannot be fulfilled, program will increase the width to accommodate 
	    towerlength = 90, //always fulfill the tower length
	    bridges = 4,
	    bridgehead = 1.92, //the minimum width of a bridgehead is 2x linewidth 
	    minimumPurgeVolume = 150,
	    defaultSpeed = overrides.defaultSpeed ? overrides.defaultSpeed : 3000,
	    firslayerspeed = 900,
	    slowLayer = 1, //layer before 1mm will be slowed
	    currentlayerspeed = 900,
	    centeriszero = true,
	    bedXsize = 180,
	    bedYsize = 180,
	    originX = 0,
	    originY = 0,
	    centerX = 0,
	    centerY = 0,
	    retraction = overrides.retraction ? overrides.retraction : 3,
	    retractionSpeed = overrides.retractionSpeed > 0 ? overrides.retractionSpeed : 1800,
	    prime = overrides.prime ? overrides.prime : 0,
	    wipe = 2,
	    wipeSpeed = 4800,
	    buffer = "";

    var filamentpermm = Math.pow(linewidth/2, 2) * Math.PI * 0.1 * flowMultipler;// (0.01662945).toFixed(5), //constant, based on .1 layer height
    var minimumPurgeLength =  Math.floor(minimumPurgeVolume / (Math.PI * Math.pow(filamentDiameter/2, 2))); //based on e3d v6 clone 1.75mm

	if(typeof wipe != 'number' || wipe < 0){
		wipe = 1;
	}

	var totalBridgeHeads =  bridges + 1,
		bridgeLength = (towerlength - (bridgehead * totalBridgeHeads)) / bridges;
	//end of vars
	if(centeriszero){
		if(DEBUGMODE) console.log("Center is zero");
		originX = (-towerwidth / 2);
	    originY = (-towerlength / 2);
	} else {
		centerX = bedXsize / 2;
		centerY = bedYsize / 2;
		originX = towerwidth / 2;
	    originY = towerlength / 2;
		if(DEBUGMODE) console.log("Center is not zero");
		if(DEBUGMODE) console.log("x: " + (bedXsize/2));
		if(DEBUGMODE) console.log("y: " + (bedYsize/2));

		originX = bedXsize/2 - originX;
		originY = bedYsize/2 - originY;
	}

	this.render = function(renderOverrides){
		var isBaseLayer = renderOverrides.isBaseLayer, 
			currentZ = renderOverrides.currentZ, 
			offsetX = renderOverrides.offsetX, 
			offsetY = renderOverrides.offsetY, 
			rotation = renderOverrides.rotation, 
			infillableFilamentLength = renderOverrides.infillableFilamentLength, 
			forceSaving = renderOverrides.forceSaving,
			layerThickness = renderOverrides.layerThickness,
			forceExtraPrime = renderOverrides.forceExtraPrime,
			extraPrime = renderOverrides.extraPrime,
			xyTravelSpeed = renderOverrides.xyTravelSpeed ? renderOverrides.xyTravelSpeed : 4800;

		buffer = ";Prime tower begins\n; prime pillar\n";

		if(isBaseLayer){
			currentlayerspeed = firslayerspeed;
			layerThickness = layerThickness * baseLayerExtrusionMultipler;
		} else {
			currentlayerspeed = defaultSpeed;

			if(currentZ < slowLayer){
				currentlayerspeed = Math.floor(defaultSpeed * currentZ / slowLayer);
				layerThickness = layerThickness * baseLayerExtrusionMultipler;
			}			
		}

		currentlayerheight = ((currentZ + zOffset) * 1).toFixed(2);

		var filamentToBePurged = forceSaving ? 0 : minimumPurgeLength - infillableFilamentLength,
			x = 0, 
			y = 0, 
			z = currentlayerheight, 
			e = 0, 
			eLength = 0,
			savingMode = false,
			flowRate = 1; 

		if(DEBUGMODE) console.log("minimum filament to be purged: " + filamentToBePurged);

		if(forceSaving || infillableFilamentLength > 0){
			savingMode = true;
		}

		if(isBaseLayer || currentZ < slowLayer){
			filamentToBePurged = minimumPurgeLength;
			savingMode = true;
		}

		var totalPrime = prime;

		if(forceExtraPrime){
			totalPrime += extraPrime;
		}

		buffer += "G92 E0\n"; // zeroing e length.
		buffer += 'G1 Z' + currentlayerheight + " F1500\n"; // first layer z height
		buffer += "G1 E" + totalPrime + " F1500\n"; // prime a little
		buffer += "G92 E0\n"; // zeroing e length.

		if(currentZ < slowLayer){
			buffer += "M106 S0\n";
		}

		drawUntil((originX + towerwidth).toFixed(3), originY, extrusion = 0, xyTravelSpeed, "init point");

		var drawX = 0,
			drawY = 0,
			drawE = 0;

		//with saving mode we will generate bridgeheads 
		if(savingMode){
			if(DEBUGMODE) console.log("savingMode detected");
			for(var i = 0; i < totalBridgeHeads; i++){
				for(var b = 0, c = 0; b <= bridgehead; b += linewidth, c++){
					if(DEBUGMODE) console.log("E length: " + eLength + ", Absolute E: " + e.toFixed(5));
					drawX = ((originX + towerwidth - linewidth * 2).toFixed(3)),
					drawY = ((c * linewidth + bridgeLength * i + i * bridgehead + originY - linewidth).toFixed(3)),
					drawE = (e).toFixed(5);
					drawUntil(drawX, drawY, drawE, currentlayerspeed, "b=" + b + ", i=" + i + ", c=" + c);
					e += getExtrusionLength(towerwidth, layerThickness);

					if(DEBUGMODE) console.log("E length: " + eLength + ", Absolute E: " + e.toFixed(5));
					drawX = ((originX).toFixed(3)),
					drawY = ((c * linewidth + bridgeLength * i + i * bridgehead + originY - linewidth).toFixed(3)),
					drawE = (e).toFixed(5);
					drawUntil(drawX, drawY, drawE, currentlayerspeed, "b=" + b + ", i=" + i + ", c=" + c);

					if( !(i == totalBridgeHeads - 1 && b == bridgehead - linewidth)){
						e += getExtrusionLength(towerwidth, layerThickness);
					}

					if(b == bridgehead){
						if(DEBUGMODE) console.log("bridgehead length: " + bridgehead);
					}
				}
			}
		}

		for(var oddity = 0; x <= towerwidth || e < filamentToBePurged; x += linewidth, oddity++){
			if(e > filamentToBePurged){
				if(DEBUGMODE) console.log("Purging length accomplished!");
				break;
			}

			if(x==0 && !savingMode){
				// console.log("here11");
				// fs.appendFileSync(fd, ";here11\n");
			    if(DEBUGMODE) console.log("E length: " + eLength + ", Absolute E: " + e.toFixed(5));
				drawX = ((x + originX + towerwidth - linewidth).toFixed(3)),
				drawY = ((y + originY).toFixed(3)),
				drawE = (e).toFixed(5);
				drawUntil(drawX, drawY, drawE, currentlayerspeed, "set starting point");
				e += getExtrusionLength(towerwidth, layerThickness);	
			}

			if(x==linewidth && !savingMode){
				// console.log("here");
				// fs.appendFileSync(fd, ";Here\n");
				e += getExtrusionLength(towerwidth, layerThickness);
			    if(DEBUGMODE) console.log("E length: " + eLength + ", Absolute E: " + e.toFixed(5));
				drawX = ((x + originX + towerwidth).toFixed(3)),
				drawY = ((y + originY + towerlength - linewidth).toFixed(3)),
				drawE = (e).toFixed(5);
				drawUntil(drawX - linewidth *2, drawY, drawE, currentlayerspeed, "draw second outline");
				drawUntil(drawX-towerwidth, drawY, drawE, currentlayerspeed);
				e += getExtrusionLength(towerlength, layerThickness);
			}

			if(!savingMode){
				var gotoX = ((x + originX).toFixed(3)),
				    gotoY = ((y + originY).toFixed(3)),
				    gotoE =  (e).toFixed(5);

				drawUntil(gotoX, gotoY, gotoE, currentlayerspeed);

				e += getExtrusionLength(towerlength, layerThickness);
				if(DEBUGMODE) console.log("E length: " + eLength + ", Absolute E: " + e.toFixed(5));

				drawX = ((x + originX).toFixed(3)),
				drawY = ((y + originY + towerlength - linewidth).toFixed(3)),
				drawE = (e).toFixed(5);
				drawUntil(drawX, drawY, drawE, currentlayerspeed);
			} else{
				if(oddity % 2 == 0){
					for(var i = totalBridgeHeads -1; i > 0; i--){
						drawX = ((x + originX).toFixed(3)),
						drawY = ((bridgeLength * i + bridgehead * i + originY - linewidth/2).toFixed(3)),
						drawE = (e).toFixed(5);
						drawUntil(drawX, drawY, drawE, currentlayerspeed, "reversing start");

						e += getExtrusionLength(bridgeLength + linewidth, layerThickness);

						drawX = ((x + originX).toFixed(3)),
						drawY = ((bridgeLength * (i-1) + bridgehead * (i) + originY - linewidth/2).toFixed(3)),
						drawE = (e).toFixed(5);

						drawUntil(drawX, drawY, drawE, currentlayerspeed, "i =" + i);

						if(DEBUGMODE) console.log("Reverse E length: " + eLength + ", Absolute E: " + e.toFixed(5));
					}
				} else {
					for(var i = 0; i < totalBridgeHeads - 1; i++){
						drawX = ((x + originX).toFixed(3)),
						drawY = ((bridgeLength * i + bridgehead * (i+1) + originY - linewidth/2).toFixed(3)),
						drawE = (e).toFixed(5);
						drawUntil(drawX, drawY, drawE, currentlayerspeed);

						e += getExtrusionLength(bridgeLength + linewidth, layerThickness);

						drawX = ((x + originX).toFixed(3)),
						drawY = ((bridgeLength * (i+1) + bridgehead * (i+1) + originY + linewidth/2).toFixed(3)),
						drawE = (e).toFixed(5);
						drawUntil(drawX, drawY, drawE, currentlayerspeed, "i =" + i);
						if(DEBUGMODE) console.log("E length: " + eLength + ", Absolute E: " + e.toFixed(5));
					}
				}
			}

			if(DEBUGMODE) console.log("e > filamentToBePurged: " + (e > filamentToBePurged));
			if(DEBUGMODE) console.log("x > (towerwidth - linewidth): " + (x > (towerwidth - linewidth)));
			if(DEBUGMODE) console.log("x: " + x * 1);
			if(DEBUGMODE) console.log("(towerwidth - linewidth): " + (towerwidth - linewidth) *1);

			if(e > filamentToBePurged && x *1 >= (towerwidth - linewidth) * 1){
				if(DEBUGMODE) console.log("end");

				if(isBaseLayer){
					towerwidth = x.toFixed(2) * 1 + linewidth;
					if(DEBUGMODE) console.log("towerwidth: " + towerwidth);
				}
			}
		}

		var wipeY1 = originY, wipeY2; 

		if( Math.abs(originY - drawY) > Math.abs(towerlength + originY - drawY) ){
			if(DEBUGMODE) console.log("closer to -Y");
			wipeY1 = originY + towerlength - linewidth;
			wipeY2 = originY + linewidth;
		} else {
			wipeY1 = originY + linewidth;
			wipeY2 = originY + towerlength - linewidth;
			if(DEBUGMODE) console.log("closer to +Y");
		}


		if(wipe > 0){
			var smallRetraction = (retraction / wipe) * -1;
			for(var w=0; w < wipe; w++){
				if(DEBUGMODE) console.log('wipe #' + w);
				buffer += "G92 E0\n"; // zeroing e length.
				drawUntil( originX, wipeY1,  0, wipeSpeed);
				drawUntil( originX + towerwidth - linewidth, wipeY2,  smallRetraction, wipeSpeed);
			}
		}
		
		buffer += "G92 E0\n";
		buffer += ";Prime tower ends\n";

		return {gcode: buffer, originXY: applyTransfromations(originX, originY)};

		function drawUntil(x, y, e, speed, comment){
			if(DEBUGMODE && comment && comment.length > 0){
				comment = ';' + comment;
			} else {
				comment = '';
			}

			var xy = applyTransfromations(x,y);

			x = (xy[coordX = 0]);
			y = (xy[coordY = 1]);

			if(e == 0){
				buffer += 'G1 X' + x + ' Y' + y + " F"+ speed + comment + "\n";
			} else {
				buffer += 'G1 X' + x + ' Y' + y + ' E' + e + " F"+ speed + comment + "\n";
			}
			
		}

		function getExtrusionLength(distance, layerThickness){
			eLength = ((filamentpermm * layerThickness / 0.1 * Math.abs(distance) * extrusionMultipler).toFixed(5)) * 1;
			return eLength;
		}

		function fadeOffset(zOffset){
			var fade = 0.02

			if(zOffset - fade < 0){
				return 0;
			}

			return zOffset - fade;
		}

		function rotate(cx, cy, x, y, angle) {
		    var radians = (Math.PI / 180) * angle,
		        cos = Math.cos(radians),
		        sin = Math.sin(radians),
		        nx = (cos * (x - cx)) + (sin * (y - cy)) + cx,
		        ny = (cos * (y - cy)) - (sin * (x - cx)) + cy;
		    return [nx, ny];
		}

		function applyTransfromations(x,y){
			x = x * 1 + offsetX;
			y = y * 1 + offsetY;

			if(rotation != 0){
				var rotated = rotate(centerX, centerY, x*1,y*1, rotation);
				x = rotated[0].toFixed(3);
				y = rotated[1].toFixed(3);
			}

			return [x, y];
		}
	}
};

module.exports = PrimeTower;


