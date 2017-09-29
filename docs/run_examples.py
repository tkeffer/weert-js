"""Used to generate the example output.

To use:

 1. Make sure InfluxDB is running
 2. Drop the "weert" database from InfluxDB:

 $ influx
 > use weert
 > drop database weert
 > exit

 3. Make sure that the WeeRT server is running

 4. Run the Python code:

 $ cd weert


"""
import json
import subprocess
import optparse
import sys

description = """Run the examples in the WeeRT API markdown documentation"""

usage = """%prog: input-file [--help]"""

MARGIN = 85

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

def extractCmd(gen):
    """Extract shell commands out of the markdown.

    Shell commands embedded in a markdown pseudo-comment are
    extracted and returned.

    Example:

    [//]: # (ls -l)
    """
    
    cmd = ""
    while True:
        if not gen.peek().startswith('[//]'):
            return cmd
        line = gen.next()
        left = line.index('(')
        right = line.index(')')
        cmd += line[left + 1: right] + '\n'

def pretty_cmd(cmd):
    result =  ""
    current_line = "$ "
    for x in cmd.split():
        if len(current_line) + len(x) > MARGIN-2:
            result += current_line + " \\\n"
            current_line = ">   "
        current_line += x + " "
    result += current_line + "\n"
    return result    

def prettify_string(str):

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
                cmd = extractCmd(gen)
                p = subprocess.Popen(cmd, shell=True, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                _, _ = p.communicate(input=cmd)
            # Look for shell commands to be run "noisily," that is, their output
            # will be included
            elif gen.peek().startswith('$'):
                line = gen.next()
                stripped_line = line.strip()
                shell_str = stripped_line[1:].strip()
                # Fire off the curl command, collecting its standard output
                p = subprocess.Popen(shell_str, shell=True, stdout=subprocess.PIPE)
                output, err = p.communicate()
                print line
                print prettify_string(output)
                # Fast forward past any old shell output
                while not gen.peek().startswith('```'):
                    gen.next()
            else:
                line = gen.next()
                print line,
        except StopIteration:
            sys.exit(0)
    
    
    
    
    
    
    
    
    
    
#     for line in fd:
#         stripped_line = line.strip()
#         if stripped_line.startswith('$'):
#             curl_str = stripped_line[1:].strip()
#             curl_cmd = curl_str.split(' ')
#             # Get rid of any quote marks. They are not needed when running through Popen.
#             curl_cmd[-1] = curl_cmd[-1].replace("'", '')
#             print curl_cmd
# 
#             # Fire off the curl command, collecting its standard output
#             p = Popen(curl_cmd, shell=False, stdout=PIPE)
#             output, err = p.communicate()
#             return_code = p.wait()
#             if return_code:
#                 raise IOError("Invalid return code from curl: %s" % return_code)
#                     
#             print output
    
if __name__ == "__main__" :
    main()
