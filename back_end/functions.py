from openai import OpenAI

# deepseek
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key="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",
)

# perplexity
# client = OpenAI(
#   base_url="https://api.perplexity.ai",
#   api_key="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",
# )


import copy
import json

def generate(prompts, max_br=3):
    system_prompt = f"""
You are DeepMapResearch, an AI researcher.
Given a topic or a question, generate a maximum of {max_br} independent parallel responses expanding on the main topic.
STRICTLY return only VALID JSON in this exact format: ['response1', 'response2', 'response3'].Do not include any extra text or explanations.
STRICT RULE: RETURN ONLY VALID JSON!
    """
    system_prompt2 = f"""
You are DeepMapResearch, an AI researcher.
Given a topic or a question, generate a maximum of {max_br} independent parallel responses expanding on the main topic.
use ONLY this delimiter #other_parallel_response# to give separated independent parallel responses, with no extra text or explanations.
"""

# llama-3.1-sonar-large-128k-chat
# deepseek/deepseek-r1:free
    completion = client.chat.completions.create(
        extra_headers={
            "HTTP-Referer": "<YOUR_SITE_URL>",  # Optional. Used for rankings on openrouter.ai.
            "X-Title": "<YOUR_SITE_NAME>",  # Optional. Used for rankings on openrouter.ai.
        },
        model="deepseek/deepseek-r1:free",

        messages=[
            {"role": "system", "content": system_prompt2},
            {"role": "user", "content": prompt}
        ]
    )

    response_content = completion.choices[0].message.content
    responses = response_content.split("#other_parallel_response#")
    return responses



def trace_paths(node, current_path):
    """
    Recursively traces all leaf nodes back to the root.
    Returns a list of full paths from root to each leaf.
    """
    if not node["branches"]:  # If it's a leaf node
        return [current_path + [node["prompt"]]]

    paths = []
    for branch in node["branches"]:
        paths.extend(trace_paths(branch, current_path + [node["prompt"]]))

    return paths



def go_deeper(initial_tree, max_branches):
    """
    Expands the tree one level deeper without modifying the original tree.
    - Finds all leaf nodes.
    - Combines full path to get the input.
    - Uses generate() to create new branches.
    - Returns a new updated tree.
    """
    # Make a deep copy of the initial tree to avoid modifying it directly
    tree = copy.deepcopy(initial_tree)

    leaf_paths = trace_paths(tree, [])  # Get all leaf paths

    def expand_tree(node, path):
        if not node["branches"]:  # If it's a leaf
            full_prompt = " ".join(path)  # Combine all prompts from root to leaf
            new_responses = generate(full_prompt, 2)  # Generate new branches
            node["branches"] = [{"prompt": resp, "branches": []} for resp in new_responses]  # Attach new branches
        else:
            for branch in node["branches"]:
                expand_tree(branch, path + [branch["prompt"]])  # Recursive call with updated path

    expand_tree(tree, [tree["prompt"]])
    return tree


def generate_level_one_tree(prompt,max_br):
  firstLevelTree={}
  firstLevelTree["prompt"]=prompt
  firstLevelTree["branches"]=[]
  responses = generate(prompt, max_br)
  for response in responses:
    if response.strip() == "":
      continue
    firstLevelTree["branches"].append({"prompt":response,"branches":[]})
  return firstLevelTree