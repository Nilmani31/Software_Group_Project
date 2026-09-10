from io import BytesIO

import torch
from PIL import Image

try:
	import open_clip
except ImportError:
	open_clip = None


_model = None
_preprocess = None
_tokenizer = None
_device = None


def _init_model():
	global _model, _preprocess, _tokenizer, _device
	if open_clip is None:
		raise RuntimeError("open_clip is not installed. Add it to requirements.txt.")

	if _model is not None:
		return

	_device = "cuda" if torch.cuda.is_available() else "cpu"
	_model, _, _preprocess = open_clip.create_model_and_transforms(
		"ViT-B-32", pretrained="laion2b_s34b_b79k"
	)
	_tokenizer = open_clip.get_tokenizer("ViT-B-32")
	_model.to(_device)
	_model.eval()


def image_to_embedding(image_bytes: bytes):
	_init_model()

	image = Image.open(BytesIO(image_bytes)).convert("RGB")
	image_input = _preprocess(image).unsqueeze(0).to(_device)

	with torch.no_grad():
		image_features = _model.encode_image(image_input)
		image_features = image_features / image_features.norm(dim=-1, keepdim=True)

	return image_features[0].cpu().tolist()
def text_to_embedding(text: str):
	"""Embed a text prompt (e.g. "a photo of Arrack") into the same space
	as image embeddings, for zero-shot matching with no reference photos."""
	_init_model()

	text_input = _tokenizer([text]).to(_device)

	with torch.no_grad():
		text_features = _model.encode_text(text_input)
		text_features = text_features / text_features.norm(dim=-1, keepdim=True)

	return text_features[0].cpu().tolist()
DEFAULT_PROMPT_TEMPLATES = [
	"a photo of {}",
	"a close-up product photo of {}",
	"{}, an item in a bar and kitchen inventory",
	"a picture of {}",
]


def text_to_embedding_ensemble(name: str, templates=None):
	"""Embed an item name using several prompt phrasings and average them
	into one embedding. This "prompt ensembling" smooths out any one
	template's quirks and generally improves zero-shot accuracy over a
	single fixed prompt."""
	_init_model()

	if templates is None:
		templates = DEFAULT_PROMPT_TEMPLATES

	prompts = [template.format(name) for template in templates]
	text_input = _tokenizer(prompts).to(_device)

	with torch.no_grad():
		text_features = _model.encode_text(text_input)
		# Normalize each prompt's embedding individually first...
		text_features = text_features / text_features.norm(dim=-1, keepdim=True)
		# ...then average across prompts...
		mean_features = text_features.mean(dim=0)
		# ...then re-normalize the averaged vector back to unit length.
		mean_features = mean_features / mean_features.norm()

	return mean_features.cpu().tolist()
