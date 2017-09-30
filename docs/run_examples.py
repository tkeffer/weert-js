"""Runs the examples embedded in the README file, collecting the output,
and plugs it into the markdown.

To use:

1. Make sure InfluxDB is running

2. Make sure that the WeeRT server is running

3. Run the Python code:

   $ cd weert
   $ docs/run_examples README.md > test.md
 
4. Look over test.md. If it looks good, substitute it for README.md
 
   $ mv test.md README.md

"""
import json
import optparse
import subprocess
import sys


description = """Run the examples in the WeeRT API markdown documentation"""

usage = """%prog: input-file [--help]"""

class GenWithPeek(object):
    """Generator object which allows a peek at the next object to be returned.

    Sometimes Python solves a complicated problem with such elegance! This is
    one of them.

    Example of usage:
    >>> # Define a generator function:
    >>> def genfunc(N):
    ...     for i in range(N):
    ...        yield i
    >>>
    >>> # Now wrap it with the GenWithPeek object:
    >>> g_with_peek = GenWithPeek(genfunc(5))
    >>> # We can iterate through the object as normal:
    >>> for i in g_with_peek:
    ...    print i
    ...    # Every second object, let's take a peek ahead
    ...    if i%2:
    ...        # We can get a peek at the next object without disturbing the wrapped generator:
    ...        print "peeking ahead, the next object will be: ", g_with_peek.peek()
    0
    1
    peeking ahead, the next object will be:  2
    2
    3
    peeking ahead, the next object will be:  4
    4
    """
    
    def __init__(self, generator):
        """Initialize the generator object.

        generator: A generator object to be wrapped
        """
        self.generator = generator
        self.have_peek = False
        
    def __iter__(self):
        return self
    
    def next(self):  # @ReservedAssignment
        """Advance to the next object"""
        if self.have_peek:
            self.have_peek = False
            return self.peek_obj
        else:
            return self.generator.next()
        
    def peek(self):
        """Take a peek at the next object"""
        if not self.have_peek:
            self.peek_obj = self.generator.next()
            self.have_peek = True
        return self.peek_obj

def extract_from_comments(gen):
    """Extract shell commands out of the markdown.

    Shell commands embedded in a markdown pseudo-comment are
    extracted and returned.

    Example:

    [//]: # (ls -l)
    """
    
    cmd = ""
    lines = ""
    while True:
        # Are we done?
        if not gen.peek().startswith('[//]'):
            return (cmd, lines)
        # Get the next line
        line = gen.next()
        # Find the command delimiters for this line
        left = line.index('(')
        right = line.index(')')
        # Extract the command from the line and append it to the others
        cmd += line[left + 1: right] + '\n'
        # Save the raw lines s well
        lines += line

def extract_multi_line(gen):
    """Extract a (possibly) multi line command"""
    
    cmd = ""
    lines = ""
    for line in gen:
        lines += line
        cmd += line.replace('>', '')
        if not line.endswith('\\\n'):
            return (cmd, lines)
        
def prettify_string(str):
    """Prettify the results returned from the curl commands"""
    result = ""
    for line in str.split('\n'):
        if line.startswith('{') or line.startswith('['):
            # Pretty print any JSON
            result += json.dumps(json.loads(line), sort_keys=True, indent=4, separators=(',', ': ')) + "\n"
        else:
            result += line

    return result


def main():
    
    # Create a command line parser:
    parser = optparse.OptionParser(description=description, usage=usage)
    
    # Parse the command line:
    (options, args) = parser.parse_args()

    if not args:
        sys.exit("Missing input file")
        
    input_file = args[0]
    fd = open(input_file, 'r')

    # Wrap the file descriptor with the "peeking" generator
    gen = GenWithPeek(fd)
    
    while True:
        try:
            # Look for shell commands to be run silently. 
            # They will be embedded in a markdown pseudo-comment.
            if gen.peek().startswith('[//]'):
                # Found one. Extract it and run it, throwing away the output
                cmd, comments = extract_from_comments(gen)
                p = subprocess.Popen(cmd, shell=True, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                _, _ = p.communicate(input=cmd)
                print comments
            # Look for shell commands to be run "noisily," that is, their output
            # will be included
            elif gen.peek().startswith('$'):
                shell_cmd, lines = extract_multi_line(gen)
                # Fire off the curl command, collecting its standard output
                p = subprocess.Popen(shell_cmd[1:], shell=True, stdout=subprocess.PIPE)
                output, err = p.communicate()
                print lines
                print prettify_string(output)
                # Fast forward past any old shell output
                while not gen.peek().startswith('```'):
                    gen.next()
            else:
                # Just a regular line. Get it  and print it
                line = gen.next()
                print line,
        except StopIteration:
            sys.exit(0)
    
if __name__ == "__main__" :
    main()
