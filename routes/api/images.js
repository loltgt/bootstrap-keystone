var keystone = require('keystone');


exports = module.exports = function(req, res) {
	var Media = keystone.list('Media');

	Media.model.find()
	.select('title type image')
	.exec(function(err, items) {

		if (err) {
			return res.apiError('database error', err);
		}

		var _items = [];

		items.forEach(function(item) {
			if (item.type !== 'image') {
				return;
			}

			var _item;

			if (item.image.landscape.exists) {
				_item = {};
				_item.imageUrl = item.image.landscape.thumb('small');
				_item.name = '(L) ';
				_item.name += (item.title || item.image.landscape.filename);
				_item.value = item.image.landscape.href;
				_items.push(_item);
			}

			if (item.image.portrait.exists) {
				_item = {};
				_item.imageUrl = item.image.portrait.thumb('small');
				_item.name = '(P) ';
				_item.name += (item.title || item.image.portrait.filename);
				_item.value = item.image.portrait.href;
				_items.push(_item);
			}
		});

		res.apiResponse({
			'data': _items
		});
	});
};