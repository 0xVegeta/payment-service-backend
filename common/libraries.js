const crypto = require('crypto')

function generateMaskedCode({identifier, className}) {
    const class_prefix_map = {
        'Transaction': 'txn-', 'Wallet': 'wllt-', 'User':'usr-'
    }
    const prefix = class_prefix_map[className]
    if (typeof prefix === 'undefined') {
        return false
    }
    const mask = {
        '0': '9', '1': 'w', '2': 'c', '3': 'f', '4': '7', '5': 'r', '6': 'v', '7': 'y', '8': 'x', '9': '0',
        'a': '1', 'b': 'd', 'c': 'p', 'd': 'q', 'e': 'r', 'f': 'z', 'g': 'h', 'h': '3', 'i': 'b', 'j': 'a',
        'k': '5', 'l': 'j', 'm': 'u', 'n': 'x', 'o': 's', 'p': 'n', 'q': '4', 'r': '8', 's': 'y', 't': 'g',
        'u': 'i', 'v': 't', 'w': 'a', 'x': 'k', 'y': '6', 'z': 'e'
    };

    const hash = crypto.createHash('sha256').update(identifier.toString()).digest('hex');
    let code = '';
    for (let i = 0; i < 6; i++) {
        const index = parseInt(hash.substring(i * 4, i * 4 + 4), 16) % Object.keys(mask).length;
        code += mask[Object.keys(mask)[index]];
    }
    return prefix + code;
}


const check =generateMaskedCode({ identifier: '6422e262dad700744aded37c', className: 'Transaction' })
console.log('check-----------------------', check)


module.exports = {
    generateMaskedCode
}