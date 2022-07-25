module.exports = class Helper {
    static CircleCollision(obj1, obj2) {
        var p1x = obj1.Position.x;
        var p1y = obj1.Position.y;
        var r1 = obj1.Size;
        var p2x = obj2.Position.x;
        var p2y = obj2.Position.y;
        var r2 = obj2.Size;
        var a;
        var x;
        var y;
    
        a = r1 + r2;
        x = p1x - p2x;
        y = p1y - p2y;
    
        if (a > Math.sqrt((x * x) + (y * y))) {
            return true;
        } else {
            return false;
        }
    }
    
    static DistanceBetween(obj1, obj2) {
        var x1 = obj1.Position.x;
        var x2 = obj2.Position.x;
        var y1 = obj1.Position.y;
        var y2 = obj2.Position.y;
        var x = (x1-x2);
        var y = (y1-y2);
        return Math.sqrt((x*x) + (y*y));
    }
    
    static getRandomNumberBetween(min,max){
        return Math.floor(Math.random()*(max-min+1)+min);
    }
    static CreateUUID(type) {
        function uuid(mask = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx') {
            return `${mask}`.replace(/[xy]/g, function(c) {
                var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
                return v.toString(16);
            });
        }
        return uuid(type + "-xxxx-xxxx-xxxx-xxx-OBJECT");
    }
}